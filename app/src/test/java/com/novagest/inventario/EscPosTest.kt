package com.novagest.inventario

import com.novagest.inventario.data.printer.EscPos
import com.novagest.inventario.data.printer.PaperWidth
import com.novagest.inventario.data.printer.TicketData
import com.novagest.inventario.data.printer.TicketLine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pruebas del generador ESC/POS (A-02).
 *
 * No necesitan impresora ni teléfono: se comprueba el flujo de bytes que se
 * envía por Bluetooth.
 */
class EscPosTest {

    private val ticket = TicketData(
        businessName = "Bodega Peña",
        date = "24/10/2026",
        time = "15:32",
        lines = listOf(
            TicketLine("Nevera", 2.0, 5.0, 10.0),
            TicketLine("Olla a presión", 1.0, 7.5, 7.5)
        ),
        totalUsd = 17.5,
        rateCupUsd = 750.0,
        paymentType = "CONTADO",
        seller = "Ana Pérez",
        width = PaperWidth.MM_58
    )

    private fun texto(bytes: ByteArray) = String(bytes, Charsets.US_ASCII)

    @Test
    fun `el ticket empieza inicializando la impresora`() {
        val bytes = EscPos.build(ticket)
        assertEquals(0x1B, bytes[0].toInt())
        assertEquals(0x40, bytes[1].toInt())
    }

    @Test
    fun `el ticket termina con avance de papel y corte`() {
        val bytes = EscPos.build(ticket)
        val fin = bytes.takeLast(4)
        assertEquals(listOf(0x1D, 0x56, 0x42, 0x00), fin.map { it.toInt() })
    }

    @Test
    fun `imprime encabezado, lineas y totales`() {
        val t = texto(EscPos.build(ticket))
        assertTrue(t.contains("Bodega Pena"))          // acentos plegados
        assertTrue(t.contains("Ticket de venta"))
        assertTrue(t.contains("24/10/2026 15:32"))
        assertTrue(t.contains("2 x Nevera"))
        assertTrue(t.contains("10.00"))
        assertTrue(t.contains("TOTAL USD"))
        assertTrue(t.contains("17.50"))
        assertTrue(t.contains("13125.00"))             // 17.5 USD x 750 CUP
        assertTrue(t.contains("Contado"))
        assertTrue(t.contains("Atendio"))
        assertTrue(t.contains("Ana Perez"))
        assertTrue(t.contains("Gracias por su compra"))
    }

    @Test
    fun `un fiado sale como fiado y con el cliente`() {
        val fiado = ticket.copy(paymentType = "FIADO", customer = "Juan Ruiz", rateCupUsd = 0.0)
        val t = texto(EscPos.build(fiado))
        assertTrue(t.contains("Fiado"))
        assertTrue(t.contains("Juan Ruiz"))
        assertTrue(!t.contains("Equivalente CUP"))
    }

    @Test
    fun `las lineas se alinean al ancho del papel`() {
        val l58 = EscPos.padLine("Total", "17.50", PaperWidth.MM_58.columns)
        val l80 = EscPos.padLine("Total", "17.50", PaperWidth.MM_80.columns)
        assertEquals(32, l58.length)
        assertEquals(48, l80.length)
        assertTrue(l58.startsWith("Total"))
        assertTrue(l58.endsWith("17.50"))
        assertTrue(l80.endsWith("17.50"))
    }

    @Test
    fun `un nombre largo se recorta sin romper el ancho`() {
        val largo = "Producto con un nombre larguísimo que no cabe en el papel"
        val linea = EscPos.padLine(largo, "1234.56", PaperWidth.MM_58.columns)
        assertEquals(32, linea.length)
        assertTrue(linea.endsWith("1234.56"))
    }

    @Test
    fun `el texto se pliega a ASCII`() {
        assertEquals("Pena No 5 - 2EUR", EscPos.fold("Peña Nº 5 — 2€"))
        assertEquals("Nandu y cuna", EscPos.fold("Ñandú y cuna"))
        assertEquals("Acentos: aeiou", EscPos.fold("Acentos: áéíóú"))
        assertEquals("desconocido?", EscPos.fold("desconocido\u0001"))
    }

    @Test
    fun `importes y cantidades se formatean como en la caja`() {
        assertEquals("17.50", EscPos.money(17.5))
        assertEquals("0.00", EscPos.money(0.0))
        assertEquals("2", EscPos.qty(2.0))
        assertEquals("2.5", EscPos.qty(2.5))
    }

    @Test
    fun `el papel de 80 mm usa mas columnas`() {
        val ancho = texto(EscPos.build(ticket.copy(width = PaperWidth.MM_80)))
        assertEquals(48, EscPos.centered("Ticket", PaperWidth.MM_80.columns).length)
        assertTrue(ancho.contains(EscPos.divider(48)))
        assertTrue(!ancho.contains(EscPos.divider(PaperWidth.MM_58.columns)))
    }

    @Test
    fun `un negocio sin nombre usa NovaGest`() {
        val t = texto(EscPos.build(ticket.copy(businessName = "   ")))
        assertTrue(t.contains("NovaGest"))
    }
}
