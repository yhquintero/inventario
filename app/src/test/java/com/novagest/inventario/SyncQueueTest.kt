package com.novagest.inventario

import com.novagest.inventario.data.sync.ConflictResolver
import com.novagest.inventario.data.sync.RetryPolicy
import com.novagest.inventario.data.sync.SyncRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pruebas de la cola de cambios pendientes (A-01): reintentos y conflictos por updatedAt. */
class SyncQueueTest {

    private fun rec(id: String, updatedAt: Long, deleted: Boolean = false, payload: String = "") =
        SyncRecord(id = id, updatedAt = updatedAt, deleted = deleted, payload = payload)

    @Test
    fun laEsperaCreceYSeQuedaEnElMaximo() {
        assertEquals(0L, RetryPolicy.delayFor(0))
        assertEquals(5_000L, RetryPolicy.delayFor(1))
        assertEquals(15_000L, RetryPolicy.delayFor(2))
        assertEquals(60_000L, RetryPolicy.delayFor(3))
        assertEquals(300_000L, RetryPolicy.delayFor(4))
        assertEquals(900_000L, RetryPolicy.delayFor(5))
        assertEquals(900_000L, RetryPolicy.delayFor(40))
    }

    @Test
    fun elProximoIntentoSeCalculaSobreElReloj() {
        val now = 1_760_000_000_000L
        assertEquals(now + 5_000L, RetryPolicy.nextAttemptAt(now, 1))
        assertEquals(now + 60_000L, RetryPolicy.nextAttemptAt(now, 3))
    }

    @Test
    fun seDejaDeReintentarTrasElMaximo() {
        assertFalse(RetryPolicy.shouldGiveUp(0))
        assertFalse(RetryPolicy.shouldGiveUp(RetryPolicy.MAX_ATTEMPTS - 1))
        assertTrue(RetryPolicy.shouldGiveUp(RetryPolicy.MAX_ATTEMPTS))
        assertTrue(RetryPolicy.shouldGiveUp(RetryPolicy.MAX_ATTEMPTS + 5))
    }

    @Test
    fun sinConflictoGanaLoLocal() {
        assertTrue(ConflictResolver.localWins(rec("p1", 100), null))
    }

    @Test
    fun ganaElUpdatedAtMasReciente() {
        assertTrue(ConflictResolver.localWins(rec("p1", 200), rec("p1", 100)))
        assertFalse(ConflictResolver.localWins(rec("p1", 100), rec("p1", 200)))
    }

    @Test
    fun enEmpateUnBorradoNoPisaUnCambio() {
        assertTrue(ConflictResolver.localWins(rec("p1", 100, deleted = false), rec("p1", 100, deleted = true)))
        assertFalse(ConflictResolver.localWins(rec("p1", 100, deleted = true), rec("p1", 100, deleted = false)))
        assertTrue(ConflictResolver.localWins(rec("p1", 100, deleted = true), rec("p1", 100, deleted = true)))
    }

    @Test
    fun laFusionConservaElServidorCuandoEsMasNuevo() {
        val remote = listOf(rec("p1", 500, payload = "servidor"), rec("p2", 100, payload = "servidor"))
        val local = listOf(rec("p1", 100, payload = "local"), rec("p2", 200, payload = "local"))
        val merge = ConflictResolver.merge(remote, local)
        assertEquals(2, merge.records.size)
        assertEquals("servidor", merge.records.first { it.id == "p1" }.payload)
        assertEquals("local", merge.records.first { it.id == "p2" }.payload)
        assertEquals(1, merge.keptRemote)
        assertEquals(1, merge.appliedLocal)
    }

    @Test
    fun laFusionAgregaLoQueElServidorNoConoce() {
        val merge = ConflictResolver.merge(listOf(rec("p1", 100)), listOf(rec("p9", 90, payload = "nuevo")))
        assertEquals(2, merge.records.size)
        assertEquals("nuevo", merge.records.first { it.id == "p9" }.payload)
        assertEquals(0, merge.keptRemote)
        assertEquals(1, merge.appliedLocal)
        assertTrue(ConflictResolver.hasLocalChanges(merge))
    }

    @Test
    fun unBorradoMasRecienteSePropaga() {
        val merge = ConflictResolver.merge(listOf(rec("p1", 100)), listOf(rec("p1", 300, deleted = true)))
        assertTrue(merge.records.single().deleted)
        assertTrue(ConflictResolver.hasLocalChanges(merge))
    }

    @Test
    fun sinCambiosLocalesNoHayNadaQueSubir() {
        val merge = ConflictResolver.merge(listOf(rec("p1", 500)), listOf(rec("p1", 100)))
        assertFalse(ConflictResolver.hasLocalChanges(merge))
        assertEquals(0, merge.appliedLocal)
        assertEquals(1, merge.keptRemote)
    }

    @Test
    fun losMensajesExplicanQuePaso() {
        assertEquals("Sin cambios pendientes.", ConflictResolver.describe(ConflictResolver.merge(emptyList(), emptyList())))
        assertEquals("Se subieron 1 cambio(s).", ConflictResolver.describe(ConflictResolver.merge(emptyList(), listOf(rec("p1", 1)))))
        assertEquals(
            "El servidor tenía 1 cambio(s) más reciente(s); se conservaron.",
            ConflictResolver.describe(ConflictResolver.merge(listOf(rec("p1", 9)), listOf(rec("p1", 1))))
        )
        assertTrue(
            ConflictResolver.describe(ConflictResolver.merge(listOf(rec("p1", 9)), listOf(rec("p1", 10))))
                .startsWith("Se subieron 1 cambio(s) y se conservaron")
        )
    }

    @Test
    fun laFusionMantieneElOrdenDelServidor() {
        val remote = listOf(rec("b", 10), rec("a", 10), rec("c", 10))
        val merge = ConflictResolver.merge(remote, listOf(rec("a", 20)))
        assertEquals(listOf("b", "a", "c"), merge.records.map { it.id })
    }
}
