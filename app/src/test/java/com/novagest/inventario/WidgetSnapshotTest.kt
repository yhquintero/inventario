package com.novagest.inventario

import com.novagest.inventario.data.local.entity.MovementEntity
import com.novagest.inventario.data.local.entity.ProductEntity
import com.novagest.inventario.widget.WidgetData
import com.novagest.inventario.widget.WidgetSnapshot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

/**
 * Pruebas del resumen del widget de inicio (A-04).
 *
 * No necesitan emulador: el widget solo enseña lo que este cálculo produce.
 */
class WidgetSnapshotTest {

    private val zona: ZoneId = ZoneId.of("America/Havana")
    private val hoy: LocalDate = LocalDate.of(2026, 10, 25)

    private fun epoch(dia: LocalDate, hora: Int = 12): Long =
        dia.atTime(hora, 0).atZone(zona).toInstant().toEpochMilli()

    private fun producto(
        id: Long,
        nombre: String,
        stock: Double,
        minimo: Double = 1.0,
        precio: Double = 10.0,
        activo: Boolean = true
    ) = ProductEntity(
        id = id, name = nombre, stockInicial = stock, stockActual = stock,
        precioVentaUsd = precio, comisionCup = 0.0, minStock = minimo, active = activo
    )

    private fun venta(dia: LocalDate, importe: Double, cantidad: Double = 1.0, tipo: String = "VENTA") = MovementEntity(
        dateEpoch = epoch(dia), weekday = "domingo", productId = 1, type = tipo,
        quantity = cantidad, unitPriceUsd = importe / cantidad, importeUsd = importe,
        center = "TIENDA", comisionCup = 0.0, stockInicial = 10.0, stockFinal = 9.0, userId = 1
    )

    @Test
    fun `la venta del dia suma solo los movimientos de hoy`() {
        val datos = WidgetSnapshot.build(
            products = listOf(producto(1, "Arroz", 20.0)),
            movements = listOf(
                venta(hoy, 30.0),
                venta(hoy, 20.0),
                venta(hoy.minusDays(1), 99.0),
                venta(hoy, 50.0, tipo = "ENTRADA")
            ),
            businessName = "Bodega Peña",
            today = hoy,
            zone = zona
        )

        assertEquals(50.0, datos.ventasHoyUsd, 0.001)
        assertEquals(2.0, datos.unidadesHoy, 0.001)
        assertEquals("Bodega Peña", datos.businessName)
    }

    @Test
    fun `la venta del mes acumula desde el dia 1`() {
        val datos = WidgetSnapshot.build(
            products = emptyList(),
            movements = listOf(
                venta(hoy, 10.0),
                venta(LocalDate.of(2026, 10, 2), 40.0),
                venta(LocalDate.of(2026, 9, 30), 500.0) // mes anterior: no cuenta
            ),
            today = hoy,
            zone = zona
        )

        assertEquals(50.0, datos.ventasMesUsd, 0.001)
    }

    @Test
    fun `cuenta agotados y productos en el minimo`() {
        val datos = WidgetSnapshot.build(
            products = listOf(
                producto(1, "Arroz", 0.0, minimo = 2.0),
                producto(2, "Frijol", 1.0, minimo = 1.0),
                producto(3, "Aceite", 50.0, minimo = 2.0),
                producto(4, "Borrado", 0.0, minimo = 1.0, activo = false)
            ),
            movements = emptyList(),
            today = hoy,
            zone = zona
        )

        assertEquals(1, datos.agotados)
        assertEquals(1, datos.stockBajo)
        assertTrue(datos.hayAlerta)
        assertEquals("1 agotado(s) · 1 en el mínimo", datos.existencias)
    }

    @Test
    fun `sin problemas de existencia el mensaje es tranquilizador`() {
        val datos = WidgetSnapshot.build(
            products = listOf(producto(1, "Arroz", 20.0)),
            movements = emptyList(),
            today = hoy,
            zone = zona
        )

        assertFalse(datos.hayAlerta)
        assertEquals("Existencias al día", datos.existencias)
        assertEquals("", datos.critico)
    }

    @Test
    fun `el producto critico es el agotado que mas valor representa`() {
        val datos = WidgetSnapshot.build(
            products = listOf(
                producto(1, "Clavo", 0.0, minimo = 1.0, precio = 1.0),
                producto(2, "Nevera", 0.0, minimo = 1.0, precio = 500.0),
                producto(3, "Arroz", 5.0, minimo = 10.0, precio = 2.0)
            ),
            movements = emptyList(),
            today = hoy,
            zone = zona
        )

        assertEquals("Nevera", datos.productoCritico)
        assertEquals("Reponer: Nevera", datos.critico)
    }

    @Test
    fun `sin ningun producto en el minimo no hay critico`() {
        val datos = WidgetSnapshot.build(
            products = listOf(producto(1, "Arroz", 30.0)),
            movements = emptyList(),
            today = hoy,
            zone = zona
        )

        assertEquals("", datos.productoCritico)
    }

    @Test
    fun `sin datos el widget invita a abrir la app`() {
        val datos = WidgetData()

        assertEquals("NovaGest", datos.businessName)
        assertEquals("$0.00", datos.ventaHoy)
        assertEquals("Abre NovaGest para actualizar", datos.pie)
        assertEquals("Existencias al día", datos.existencias)
    }

    @Test
    fun `el pie muestra la hora de actualizacion`() {
        val datos = WidgetSnapshot.build(
            products = emptyList(),
            movements = emptyList(),
            today = hoy,
            zone = zona,
            updatedAt = "15:32"
        )

        assertEquals("Actualizado 15:32", datos.pie)
    }

    @Test
    fun `el detalle junta unidades del dia y venta del mes`() {
        val datos = WidgetSnapshot.build(
            products = emptyList(),
            movements = listOf(venta(hoy, 30.0, cantidad = 3.0), venta(LocalDate.of(2026, 10, 10), 70.0)),
            today = hoy,
            zone = zona
        )

        assertEquals("3 unidad(es) · mes $100.00", datos.detalleHoy)
        assertEquals("$30.00", datos.ventaHoy)
    }
}
