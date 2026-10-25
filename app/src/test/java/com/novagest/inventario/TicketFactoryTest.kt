package com.novagest.inventario

import com.novagest.inventario.data.printer.PaperWidth
import com.novagest.inventario.data.printer.TicketFactory
import com.novagest.inventario.data.printer.TicketLine
import com.novagest.inventario.data.printer.TicketData
import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.SaleCenter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** Pruebas del ticket reimprimible (A-15): construcción, memoria y encoding. */
class TicketFactoryTest {

    private val zone: ZoneId = ZoneId.of("America/Havana")
    private val epoch: Long = LocalDateTime.of(2026, 10, 24, 15, 32)
        .atZone(zone).toInstant().toEpochMilli()

    private fun movement(
        id: Long = 1,
        product: String = "Nevera 11 pies",
        qty: Double = 2.0,
        price: Double = 5.0,
        importe: Double = 10.0,
        notes: String = "Venta rápida (App)",
        type: MovementType = MovementType.VENTA
    ) = Movement(
        id = id,
        dateEpoch = epoch,
        weekday = "sábado",
        productId = 7,
        productName = product,
        type = type,
        quantity = qty,
        unitPriceUsd = price,
        importeUsd = importe,
        center = SaleCenter.TIENDA,
        comisionCup = 0.0,
        stockInicial = 10.0,
        stockFinal = 8.0,
        userId = 3,
        userName = "Ana Pérez",
        notes = notes
    )

    @Test
    fun elTicketDeUnMovimientoLlevaFechaHoraEImporte() {
        val ticket = TicketFactory.fromMovement(movement(), "Bodega La Esquina", 750.0, PaperWidth.MM_80, zone)
        assertEquals("Bodega La Esquina", ticket.businessName)
        assertEquals("24/10/2026", ticket.date)
        assertEquals("15:32", ticket.time)
        assertEquals(10.0, ticket.totalUsd, 0.001)
        assertEquals(PaperWidth.MM_80, ticket.width)
        assertEquals("Ana Pérez", ticket.seller)
        assertEquals("CONTADO", ticket.paymentType)
        assertEquals(1, ticket.lines.size)
        assertEquals("Nevera 11 pies", ticket.lines[0].name)
        assertEquals(2.0, ticket.lines[0].qty, 0.001)
        assertEquals(5.0, ticket.lines[0].unitUsd, 0.001)
    }

    @Test
    fun elNombreVacioYElFiadoSeResuelven() {
        val fiado = TicketFactory.fromMovement(movement(notes = "Venta rápida a fiado (App)"), "  ")
        assertEquals("NovaGest", fiado.businessName)
        assertEquals("FIADO", fiado.paymentType)
    }

    @Test
    fun elTicketDeVariasVentasSumaYOrdena() {
        val lines = listOf(movement(id = 1), movement(id = 2, product = "Olla", qty = 1.0, price = 7.5, importe = 7.5))
        val ticket = TicketFactory.fromSales(lines, "Bodega", date = LocalDate.of(2026, 10, 24), zone = zone)!!
        assertEquals(17.5, ticket.totalUsd, 0.001)
        assertEquals(2, ticket.lines.size)
        assertEquals("24/10/2026", ticket.date)
        // Sin ventas no se inventa un ticket.
        assertNull(TicketFactory.fromSales(emptyList(), "Bodega"))
        assertNull(TicketFactory.fromSales(listOf(movement(type = MovementType.ENTRADA)), "Bodega"))
    }

    @Test
    fun elTicketGuardadoSeRecuperaIgual() {
        val original = TicketData(
            businessName = "Bodega La Esquina",
            date = "24/10/2026",
            time = "15:32",
            lines = listOf(TicketLine("Nevera 11 pies", 2.0, 5.0, 10.0), TicketLine("Olla", 1.0, 7.5, 7.5)),
            totalUsd = 17.5,
            rateCupUsd = 750.0,
            paymentType = "CONTADO",
            customer = "",
            seller = "Ana Pérez",
            width = PaperWidth.MM_80
        )
        val copia = TicketFactory.decode(TicketFactory.encode(original))!!
        assertEquals(original.businessName, copia.businessName)
        assertEquals(original.date, copia.date)
        assertEquals(original.time, copia.time)
        assertEquals(original.totalUsd, copia.totalUsd, 0.001)
        assertEquals(original.rateCupUsd, copia.rateCupUsd, 0.001)
        assertEquals(original.seller, copia.seller)
        assertEquals(original.width, copia.width)
        assertEquals(2, copia.lines.size)
        assertEquals("Olla", copia.lines[1].name)
        assertEquals(7.5, copia.lines[1].totalUsd, 0.001)
        assertTrue(TicketFactory.encode(original).isNotBlank())
    }

    @Test
    fun unTicketGuardadoIlegibleNoRompeNada() {
        assertNull(TicketFactory.decode(null))
        assertNull(TicketFactory.decode(""))
        assertNull(TicketFactory.decode("basura"))
        assertNull(TicketFactory.decode("solo\u001fcampos\u001fsin\u001flineas"))
        // Un ticket sin líneas tampoco se puede reimprimir.
        assertNull(TicketFactory.decode("A\u001fB\u001fC\u001f10.0\u001f0.0\u001fCONTADO\u001f\u001fAna\u001fMM_58\u001e"))
    }
}
