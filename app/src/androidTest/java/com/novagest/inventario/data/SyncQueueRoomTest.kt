package com.novagest.inventario.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.novagest.inventario.data.local.AppDatabase
import com.novagest.inventario.data.local.entity.MovementEntity
import com.novagest.inventario.data.local.entity.ProductEntity
import com.novagest.inventario.data.sync.ConflictResolver
import com.novagest.inventario.data.sync.RetryPolicy
import com.novagest.inventario.data.sync.SyncRecord
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * A-13 · Pruebas de la cola de cambios contra la base de datos real (Room).
 *
 * Las reglas de la cola ya estaban probadas en `src/test` con funciones puras; lo que faltaba
 * era comprobar la **capa de datos**: que un cambio hecho sin conexión quede de verdad
 * guardado en Room, que se pueda marcar como subido, que sobreviva a reabrir la base y que las
 * decisiones de conflicto funcionen con registros tal como los deja Room.
 *
 * Corre en el emulador (`connectedDebugAndroidTest`) con una base **en memoria**: no toca los
 * datos del teléfono y se borra al terminar.
 */
@RunWith(AndroidJUnit4::class)
class SyncQueueRoomTest {

    private lateinit var db: AppDatabase

    @Before
    fun abrirBase() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()
    }

    @After
    fun cerrarBase() {
        db.close()
    }

    private fun producto(nombre: String, stock: Double = 10.0, updatedAt: Long = 1_000L, remoteId: String? = null) =
        ProductEntity(
            name = nombre, stockInicial = stock, stockActual = stock, precioVentaUsd = 10.0,
            comisionCup = 0.0, minStock = 1.0, updatedAt = updatedAt, remoteId = remoteId
        )

    private fun movimiento(productId: Long, importe: Double = 10.0, remoteId: String? = null) =
        MovementEntity(
            dateEpoch = System.currentTimeMillis(), weekday = "domingo", productId = productId,
            type = "VENTA", quantity = 1.0, unitPriceUsd = importe, importeUsd = importe,
            center = "TIENDA", comisionCup = 0.0, stockInicial = 10.0, stockFinal = 9.0,
            userId = 1, remoteId = remoteId
        )

    /** Igual que `SyncManager`: lo pendiente de subir es lo que no tiene `remoteId`. */
    private suspend fun pendientes(): List<ProductEntity> = db.products().all().filter { it.remoteId == null }

    @Test
    fun unCambioSinConexionQuedaGuardadoYPendiente() = runBlocking {
        val id = db.products().insert(producto("Arroz"))

        val guardado = db.products().get(id)
        assertNotNull("el producto debe estar en Room", guardado)
        assertEquals("Arroz", guardado!!.name)
        assertNull("sin remoteId, el cambio está pendiente de subir", guardado.remoteId)
        assertEquals(1, pendientes().size)
    }

    @Test
    fun alSubirElCambioSeMarcaConSuIdRemotoYDejaDeEstarPendiente() = runBlocking {
        val id = db.products().insert(producto("Frijol"))

        db.products().setRemoteId(id, "srv-42")

        val guardado = db.products().get(id)!!
        assertEquals("srv-42", guardado.remoteId)
        assertTrue("ya no debe quedar nada pendiente", pendientes().isEmpty())
    }

    @Test
    fun laVentaYSuMovimientoSeGuardanJuntos() = runBlocking {
        val productoId = db.products().insert(producto("Nevera"))
        val movimientoId = db.movements().insert(movimiento(productoId, 120.0))

        val movimientos = db.movements().all()
        assertEquals(1, movimientos.size)
        assertEquals(120.0, movimientos.first().importeUsd, 0.001)
        assertEquals("VENTA", movimientos.first().type)
        assertEquals(movimientoId, movimientos.first().id)
        assertNull("el movimiento tampoco se ha subido todavía", movimientos.first().remoteId)
    }

    @Test
    fun loGuardadoSobreviveAlCerrarYReabrirLaBase() {
        // Base en archivo temporal dentro del propio test (no la del teléfono).
        val archivo = "cola-prueba-${System.nanoTime()}.db"
        val contexto = ApplicationProvider.getApplicationContext<android.content.Context>()
        val primera = Room.databaseBuilder(contexto, AppDatabase::class.java, archivo).build()
        runBlocking {
            primera.products().insert(producto("Aceite"))
            primera.movements().insert(movimiento(1, 7.5))
        }
        primera.close()

        val segunda = Room.databaseBuilder(contexto, AppDatabase::class.java, archivo).build()
        try {
            runBlocking {
                assertEquals("el producto sigue ahí tras reabrir", 1, segunda.products().all().size)
                assertEquals("el movimiento también", 1, segunda.movements().all().size)
                assertEquals("Aceite", segunda.products().all().first().name)
            }
        } finally {
            segunda.close()
            contexto.deleteDatabase(archivo)
        }
    }

    @Test
    fun elConflictoSeResuelveConElUpdatedAtRealDeRoom() = runBlocking {
        val id = db.products().insert(producto("Arroz", stock = 8.0, updatedAt = 2_000L))
        val local = db.products().get(id)!!

        // El servidor tiene una versión más vieja del mismo producto.
        val remotoViejo = SyncRecord(id = "srv-1", updatedAt = 1_500L, payload = """{"name":"Arroz","stock":10}""")
        val localRecord = SyncRecord(id = "srv-1", updatedAt = local.updatedAt, payload = """{"name":"Arroz","stock":8}""")
        assertTrue("el cambio local es más reciente: debe ganar", ConflictResolver.localWins(localRecord, remotoViejo))

        // Y al revés: si el servidor cambió después, gana el servidor.
        val remotoNuevo = remotoViejo.copy(updatedAt = 3_000L)
        assertTrue("el servidor es más reciente: no se pisa", !ConflictResolver.localWins(localRecord, remotoNuevo))

        // Un registro que el servidor no conoce (alta sin conexión) siempre se sube.
        assertTrue(ConflictResolver.localWins(localRecord, null))
    }

    @Test
    fun elBorradoNoPisaUnCambioMasReciente() {
        val borrado = SyncRecord(id = "p1", updatedAt = 1_000L, deleted = true)
        val editado = SyncRecord(id = "p1", updatedAt = 2_000L, deleted = false)

        assertTrue("el cambio posterior gana al borrado", ConflictResolver.localWins(editado, borrado))
        // El borrado tiene que ser el MÁS RECIENTE para aplicarse; si es más viejo, pierde.
        val borradoNuevo = SyncRecord(id = "p1", updatedAt = 3_000L, deleted = true)
        assertTrue("un borrado más reciente sí se aplica", ConflictResolver.localWins(borradoNuevo, editado))
        assertFalse("un borrado más viejo no pisa la edición", ConflictResolver.localWins(borrado, editado))
    }

    @Test
    fun losReintentosEsperanCadaVezMasYTerminan() {
        val primero = RetryPolicy.delayFor(1)
        val segundo = RetryPolicy.delayFor(2)
        val tercero = RetryPolicy.delayFor(3)

        assertTrue("la espera crece", primero < segundo && segundo < tercero)
        assertEquals(0L, RetryPolicy.delayFor(0))
        // A partir del quinto reintento la espera se queda en el máximo (15 min), no crece sin fin.
        val larga = RetryPolicy.delayFor(5)
        assertEquals("la espera se estabiliza", larga, RetryPolicy.delayFor(9))
        assertTrue("se deja de reintentar solo", RetryPolicy.shouldGiveUp(RetryPolicy.MAX_ATTEMPTS))
        assertTrue("todavía no", !RetryPolicy.shouldGiveUp(1))
        assertEquals(5_030L, RetryPolicy.nextAttemptAt(30, 1))
    }

    @Test
    fun fusionarRoomConElServidorConservaTodo() = runBlocking {
        db.products().insert(producto("Arroz", updatedAt = 2_000L))
        db.products().insert(producto("Frijol", updatedAt = 1_000L))
        // Se toman de la base real, pero emparejados por nombre: `all()` no garantiza el orden.
        val guardados = db.products().all().associateBy { it.name }
        val arroz = guardados.getValue("Arroz")
        val frijol = guardados.getValue("Frijol")
        val locales = listOf(
            SyncRecord(id = "srv-0", updatedAt = arroz.updatedAt, payload = arroz.name),
            SyncRecord(id = "srv-1", updatedAt = frijol.updatedAt, payload = frijol.name),
        )

        val remotos = listOf(
            SyncRecord(id = "srv-0", updatedAt = 1_000L, payload = "Arroz viejo"), // pierde
            SyncRecord(id = "srv-1", updatedAt = 5_000L, payload = "Frijol nuevo"), // gana el servidor
            SyncRecord(id = "srv-9", updatedAt = 900L, payload = "Nuevo en el servidor")
        )

        val resultado = ConflictResolver.merge(remotos, locales)
        val porId = resultado.records.associateBy { it.id }

        assertEquals(3, resultado.records.size)
        assertEquals("Arroz", porId["srv-0"]?.payload, "el cambio local más reciente debe conservarse")
        assertEquals("Frijol nuevo", porId["srv-1"]?.payload, "el servidor más reciente manda")
        assertEquals(1, resultado.appliedLocal)
        assertTrue(resultado.keptRemote >= 1)
    }

    @Test
    fun laBaseSeBorraAlTerminarCadaPrueba() = runBlocking {
        // Si el aislamiento fallara, esta prueba encontraría datos de las anteriores.
        assertTrue("cada prueba empieza con la base vacía", db.products().all().isEmpty())
        assertTrue(db.movements().all().isEmpty())
    }
}
