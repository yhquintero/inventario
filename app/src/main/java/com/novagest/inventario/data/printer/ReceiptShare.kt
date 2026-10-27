package com.novagest.inventario.data.printer

import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.util.Money
import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * A-19 · Compartir el ticket por WhatsApp.
 *
 * Aquí no hay nada de Android: se arma el **texto** que recibe el cliente, el enlace
 * de WhatsApp y el nombre del archivo de la imagen. Así se puede probar en la máquina
 * de desarrollo (y en el CI) sin emulador, y la pantalla solo se encarga de dibujar la
 * imagen y abrir el selector de aplicaciones.
 *
 * El texto se escribe pensando en WhatsApp: negritas con `*`, pocas líneas y el dato
 * importante (total y, si es fiado, el saldo) siempre a la vista.
 */
object ReceiptShare {

    private val dayFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    private val timeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
    private val fileFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmm")

    /** Encabezado del mensaje cuando el negocio no tiene nombre configurado. */
    const val DEFAULT_BUSINESS = "NovaGest"

    /** Lo que necesita la pantalla para compartir: el ticket, el texto y el nombre del PNG. */
    data class SharePayload(
        val ticket: TicketData,
        val text: String,
        val fileName: String,
        val whatsappUrl: String
    ) {
        val hasLines: Boolean get() = ticket.lines.isNotEmpty()
    }

    /**
     * Arma el mensaje que se envía al cliente.
     *
     * @param saldoUsd lo que el cliente debe **después** de esta venta (0 = al día).
     * @param customer nombre del cliente, si la venta fue a fiado o con cliente identificado.
     */
    fun buildText(
        ticket: TicketData,
        customer: String = "",
        saldoUsd: Double = 0.0,
        extraNote: String = ""
    ): String {
        val negocio = ticket.businessName.ifBlank { DEFAULT_BUSINESS }
        val lineas = StringBuilder()
        lineas.append("🧾 *").append(negocio).append("*\n")
        lineas.append(ticket.date).append(" ").append(ticket.time).append("\n\n")
        for (l in ticket.lines) {
            lineas.append("• ").append(Money.qty(l.qty)).append(" × ").append(l.name)
                .append(" — ").append(Money.usd(l.totalUsd)).append("\n")
        }
        lineas.append("\n*Total: ").append(Money.usd(ticket.totalUsd)).append("*")
        if (ticket.rateCupUsd > 0) {
            lineas.append("\nTasa ").append(Money.qty(ticket.rateCupUsd)).append(" CUP/USD · ")
                .append(Money.cup(ticket.totalUsd * ticket.rateCupUsd))
        }
        lineas.append("\n\nPago: ").append(if (ticket.paymentType.isBlank()) "CONTADO" else ticket.paymentType)
        val cliente = customer.ifBlank { ticket.customer }
        if (cliente.isNotBlank()) lineas.append("\nCliente: ").append(cliente)
        if (saldoUsd > 0.0) {
            lineas.append("\n*Saldo pendiente: ").append(Money.usd(saldoUsd)).append("*")
        } else if (cliente.isNotBlank()) {
            lineas.append("\nSaldo pendiente: al día")
        }
        if (ticket.seller.isNotBlank()) lineas.append("\nAtendido por: ").append(ticket.seller)
        if (extraNote.isNotBlank()) lineas.append("\n\n").append(extraNote.trim())
        lineas.append("\n\nGracias por su compra. 🙌")
        return lineas.toString()
    }

    /** Enlace de WhatsApp con el mensaje ya escrito (sirve con o sin app instalada). */
    fun whatsappUrl(text: String): String =
        "https://wa.me/?text=" + URLEncoder.encode(text, "UTF-8").replace("+", "%20")

    /** Enlace directo al chat de un teléfono concreto (si se conoce). */
    fun whatsappUrl(phone: String, text: String): String {
        val digits = phone.filter { it.isDigit() }
        val base = if (digits.length >= 8) "https://wa.me/$digits?text=" else "https://wa.me/?text="
        return base + URLEncoder.encode(text, "UTF-8").replace("+", "%20")
    }

    /** Nombre del archivo de la imagen: `ticket-2026-10-26-1530.png`. */
    fun fileName(ticket: TicketData, at: LocalDate? = null, zone: ZoneId = ZoneId.systemDefault()): String {
        val dia = at ?: runCatching { LocalDate.parse(ticket.date, dayFmt) }.getOrNull() ?: LocalDate.now(zone)
        val hora = ticket.time.filter { it.isDigit() }.padEnd(4, '0').take(4)
        return "ticket-${dia.format(fileFmt)}-$hora.png"
    }

    /**
     * Prepara todo lo necesario para compartir en un solo paso.
     *
     * @param movement venta del historial (opcional; si viene, se toma su nombre de producto).
     */
    fun payload(
        ticket: TicketData,
        customer: String = "",
        saldoUsd: Double = 0.0,
        phone: String = "",
        extraNote: String = "",
        at: LocalDate? = null,
        zone: ZoneId = ZoneId.systemDefault()
    ): SharePayload {
        val text = buildText(ticket, customer, saldoUsd, extraNote)
        return SharePayload(
            ticket = ticket,
            text = text,
            fileName = fileName(ticket, at, zone),
            whatsappUrl = if (phone.isBlank()) whatsappUrl(text) else whatsappUrl(phone, text)
        )
    }

    /**
     * Ticket de una venta con el saldo del cliente ya resuelto.
     *
     * @param pendingOf devuelve lo que debe un cliente por su nombre (case-insensitive).
     */
    fun payloadFor(
        movement: Movement,
        businessName: String,
        rateCupUsd: Double = 0.0,
        customerName: String = "",
        customerPhone: String = "",
        pendingOf: (String) -> Double = { 0.0 },
        width: PaperWidth = PaperWidth.MM_58,
        zone: ZoneId = ZoneId.systemDefault(),
        extraNote: String = ""
    ): SharePayload {
        val ticket = TicketFactory.fromMovement(
            movement,
            businessName = businessName,
            rateCupUsd = rateCupUsd,
            width = width,
            zone = zone
        ).copy(customer = customerName)
        val saldo = if (customerName.isBlank()) 0.0 else pendingOf(customerName)
        val dia = Instant.ofEpochMilli(movement.dateEpoch).atZone(zone).toLocalDate()
        return payload(
            ticket = ticket,
            customer = customerName,
            saldoUsd = saldo,
            phone = customerPhone,
            extraNote = extraNote,
            at = dia,
            zone = zone
        )
    }

    /** Resumen corto para el aviso de la pantalla después de compartir. */
    fun summary(payload: SharePayload): String {
        val destino = if (payload.whatsappUrl.startsWith("https://wa.me/?")) "WhatsApp" else "el chat del cliente"
        return "📤 Ticket de ${Money.usd(payload.ticket.totalUsd)} listo para $destino"
    }
}
