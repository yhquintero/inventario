package com.novagest.inventario

import com.novagest.inventario.data.printer.PaperWidth
import com.novagest.inventario.data.printer.ReceiptShare
import com.novagest.inventario.data.printer.TicketData
import com.novagest.inventario.data.printer.TicketLine
import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.SaleCenter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URLDecoder
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Pruebas de «compartir el ticket» (A-19).
 *
 * Todo lo que se puede comprobar sin Android: el texto que recibe el cliente, el enlace
 * de WhatsApp, el nombre de la imagen y el saldo del fiado.
 */
class ReceiptShareTest {

    private val zone: ZoneId = ZoneId.of("America/Havana")
    private val epoch: Long = LocalDateTime.of(2026, 10, 24, 15, 32).atZone(zone).toInstant().toEpochMilli()

    private fun ticket(
        lines: List<TicketLine> = listOf(
            TicketLine("Arroz blanco 5 kg", 2.0, 6.5, 13.0),
            TicketLine("Café molido", 1.0, 4.25, 4.25)
        ),
        total: Double = 17.25,
        rate: Double = 750.0,
        payment: String = "CONTADO",
        customer: String = "",
        seller: String = "Ana",
        business: String = "Bodega La Esquina",
        date: String = "24/10/2026",
        time: String = "15:32"
    ) = TicketData(
        businessName = business,
        date = date,
        time = time,
        lines = lines,
        totalUsd = total,
        rateCupUsd = rate,
        paymentType = payment,
        customer = customer,
        seller = seller,
        width = PaperWidth.MM_58
    )

    private fun movement(
        product: String = "Arroz blanco 5 kg",
        qty: Double = 2.0,
        importe: Double = 13.0,
        notes: String = ""
    ) = Movement(
        id = 7,
        dateEpoch = epoch,
        weekday = "sábado",
        productId = 1,
        productName = product,
        type = MovementType.VENTA,
        quantity = qty,
        unitPriceUsd = if (qty != 0.0) importe / qty else importe,
        importeUsd = importe,
        center = SaleCenter.TIENDA,
        comisionCup = 0.0,
        stockInicial = 10.0,
        stockFinal = 8.0,
        userId = 1,
        userName = "Ana",
        notes = notes
    )

    @Test
    fun `el texto lleva el negocio, la fecha, las lineas y el total`() {
        val texto = ReceiptShare.buildText(ticket())
        assertTrue("nombre del negocio", texto.contains("Bodega La Esquina"))
        assertTrue("fecha y hora", texto.contains("24/10/2026 15:32"))
        assertTrue("línea 1", texto.contains("2 × Arroz blanco 5 kg — $13.00"))
        assertTrue("línea 2", texto.contains("1 × Café molido — $4.25"))
        assertTrue("total en negrita de WhatsApp", texto.contains("*Total: $17.25*"))
        assertTrue("cierre amable", texto.contains("Gracias por su compra"))
    }

    @Test
    fun `sin nombre de negocio usa NovaGest`() {
        val texto = ReceiptShare.buildText(ticket(business = "  "))
        assertTrue("marca por defecto", texto.contains(ReceiptShare.DEFAULT_BUSINESS))
    }

    @Test
    fun `la tasa se muestra en CUP cuando existe`() {
        val texto = ReceiptShare.buildText(ticket())
        assertTrue("tasa", texto.contains("Tasa 750 CUP/USD"))
        assertTrue("total en CUP", texto.contains("12,937.50 CUP"))
    }

    @Test
    fun `sin tasa no se inventa la linea de CUP`() {
        val texto = ReceiptShare.buildText(ticket(rate = 0.0))
        assertFalse("sin CUP", texto.contains("CUP"))
    }

    @Test
    fun `el pago por defecto es contado`() {
        val texto = ReceiptShare.buildText(ticket(payment = ""))
        assertTrue("contado", texto.contains("Pago: CONTADO"))
    }

    @Test
    fun `un fiado muestra el cliente y el saldo pendiente`() {
        val texto = ReceiptShare.buildText(ticket(payment = "FIADO"), customer = "José Pérez", saldoUsd = 120.0)
        assertTrue("pago fiado", texto.contains("Pago: FIADO"))
        assertTrue("cliente", texto.contains("Cliente: José Pérez"))
        assertTrue("saldo", texto.contains("*Saldo pendiente: $120.00*"))
    }

    @Test
    fun `un cliente al dia lo dice, sin inventar saldo`() {
        val texto = ReceiptShare.buildText(ticket(), customer = "José Pérez", saldoUsd = 0.0)
        assertTrue("al día", texto.contains("Saldo pendiente: al día"))
        assertFalse("no pone cero", texto.contains("$0.00"))
    }

    @Test
    fun `sin cliente no se habla de saldo`() {
        val texto = ReceiptShare.buildText(ticket())
        assertFalse("sin saldo", texto.contains("Saldo pendiente"))
        assertFalse("sin cliente", texto.contains("Cliente:"))
    }

    @Test
    fun `el cliente del ticket se usa si no se pasa otro`() {
        val texto = ReceiptShare.buildText(ticket(customer = "Marta"), saldoUsd = 10.0)
        assertTrue("usa el del ticket", texto.contains("Cliente: Marta"))
    }

    @Test
    fun `una nota extra va antes de la despedida`() {
        val texto = ReceiptShare.buildText(ticket(), extraNote = "Puede pagar el viernes.")
        assertTrue("nota", texto.contains("Puede pagar el viernes."))
        assertTrue("la despedida sigue al final", texto.indexOf("Puede pagar") < texto.indexOf("Gracias"))
    }

    @Test
    fun `el enlace de WhatsApp codifica el texto`() {
        val texto = "Total: $17.25 · 2 × Arroz"
        val url = ReceiptShare.whatsappUrl(texto)
        assertTrue("empieza por wa.me", url.startsWith("https://wa.me/?text="))
        val codificado = url.removePrefix("https://wa.me/?text=")
        assertEquals("se decodifica igual", texto, URLDecoder.decode(codificado, "UTF-8"))
        assertFalse("sin espacios sueltos en la URL", codificado.contains(" "))
        assertFalse("sin saltos de línea", codificado.contains("\n"))
    }

    @Test
    fun `el enlace puede ir al chat de un telefono`() {
        val url = ReceiptShare.whatsappUrl("+53 5555 1234", "Hola")
        assertTrue("usa el número", url.startsWith("https://wa.me/5355551234?text="))
        val corto = ReceiptShare.whatsappUrl("123", "Hola")
        assertTrue("un número raro no rompe el enlace", corto.startsWith("https://wa.me/?text="))
    }

    @Test
    fun `el nombre del archivo lleva la fecha y la hora`() {
        val nombre = ReceiptShare.fileName(ticket(), at = LocalDate.of(2026, 10, 24))
        assertEquals("nombre esperado", "ticket-2026-10-24-1532.png", nombre)
    }

    @Test
    fun `sin fecha explicita se toma la del ticket`() {
        val nombre = ReceiptShare.fileName(ticket())
        assertEquals("sale del ticket", "ticket-2026-10-24-1532.png", nombre)
    }

    @Test
    fun `un ticket con fecha ilegible no rompe el nombre`() {
        val nombre = ReceiptShare.fileName(ticket(date = "sin fecha"))
        assertTrue("sigue siendo un png", nombre.startsWith("ticket-") && nombre.endsWith(".png"))
    }

    @Test
    fun `el payload junta texto, archivo y enlace`() {
        val p = ReceiptShare.payload(ticket(), customer = "José", saldoUsd = 5.0, at = LocalDate.of(2026, 10, 24))
        assertTrue("texto", p.text.contains("Cliente: José"))
        assertEquals("archivo", "ticket-2026-10-24-1532.png", p.fileName)
        assertTrue("enlace", p.whatsappUrl.startsWith("https://wa.me/?text="))
        assertTrue("tiene líneas", p.hasLines)
    }

    @Test
    fun `el payload usa el telefono del cliente cuando lo hay`() {
        val p = ReceiptShare.payload(ticket(), customer = "José", saldoUsd = 0.0, phone = "+53 5555 1234")
        assertTrue("chat directo", p.whatsappUrl.startsWith("https://wa.me/5355551234?text="))
    }

    @Test
    fun `payloadFor toma la venta, el saldo y el dia`() {
        val p = ReceiptShare.payloadFor(
            movement = movement(),
            businessName = "Bodega La Esquina",
            rateCupUsd = 750.0,
            customerName = "José Pérez",
            customerPhone = "",
            pendingOf = { nombre -> if (nombre == "José Pérez") 120.0 else 0.0 },
            zone = zone
        )
        assertTrue("producto", p.text.contains("Arroz blanco 5 kg"))
        assertTrue("total", p.ticket.totalUsd == 13.0)
        assertEquals("nombre por la fecha de la venta", "ticket-2026-10-24-1532.png", p.fileName)
        assertTrue("saldo del cliente", p.text.contains("*Saldo pendiente: $120.00*"))
        assertTrue("pago fiado si la nota lo dice", ReceiptShare
            .payloadFor(movement(notes = "Venta rápida a fiado (App)"), "Bodega", pendingOf = { 0.0 })
            .text.contains("Pago: FIADO"))
    }

    @Test
    fun `sin cliente el saldo es cero aunque haya deudas`() {
        val p = ReceiptShare.payloadFor(
            movement = movement(),
            businessName = "Bodega",
            customerName = "",
            pendingOf = { 999.0 },
            zone = zone
        )
        assertFalse("no pone saldo", p.text.contains("Saldo pendiente"))
    }

    @Test
    fun `el resumen habla del total`() {
        val p = ReceiptShare.payload(ticket(), at = LocalDate.of(2026, 10, 24))
        assertTrue("total en el aviso", ReceiptShare.summary(p).contains("$17.25"))
        assertTrue("menciona el destino", ReceiptShare.summary(p).contains("WhatsApp"))
    }

    @Test
    fun `un ticket sin lineas no revienta`() {
        val texto = ReceiptShare.buildText(ticket(lines = emptyList(), total = 0.0))
        assertTrue("sigue habiendo total", texto.contains("Total: $0.00"))
        val p = ReceiptShare.payload(ticket(lines = emptyList(), total = 0.0))
        assertFalse("no tiene líneas", p.hasLines)
    }
}
