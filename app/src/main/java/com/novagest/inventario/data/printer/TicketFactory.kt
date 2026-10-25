package com.novagest.inventario.data.printer

import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Construye tickets imprimibles a partir de los datos de la app (A-15).
 *
 * Aquí no hay nada de Android: se puede probar en la máquina de desarrollo y
 * reutilizar desde cualquier pantalla. También guarda y recupera el último
 * ticket para poder **reimprimirlo** aunque la venta ya se haya ido de la
 * pantalla de Venta rápida.
 */
object TicketFactory {

    private val dayFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    private val timeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    /** Ticket de una venta del historial: una línea con su producto e importe. */
    fun fromMovement(
        m: Movement,
        businessName: String,
        rateCupUsd: Double = 0.0,
        width: PaperWidth = PaperWidth.MM_58,
        zone: ZoneId = ZoneId.systemDefault()
    ): TicketData {
        val at = Instant.ofEpochMilli(m.dateEpoch).atZone(zone)
        val unit = if (m.quantity != 0.0) m.importeUsd / m.quantity else m.unitPriceUsd
        return TicketData(
            businessName = businessName.ifBlank { "NovaGest" },
            date = at.format(dayFmt),
            time = at.format(timeFmt),
            lines = listOf(TicketLine(m.productName.ifBlank { "Producto" }, m.quantity, unit, m.importeUsd)),
            totalUsd = m.importeUsd,
            rateCupUsd = rateCupUsd,
            paymentType = if (m.notes.contains("fiado", true)) "FIADO" else "CONTADO",
            seller = m.userName,
            width = width
        )
    }

    /** Ticket con todas las líneas de venta de un día (o de una lista dada). */
    fun fromSales(
        sales: List<Movement>,
        businessName: String,
        rateCupUsd: Double = 0.0,
        width: PaperWidth = PaperWidth.MM_58,
        date: LocalDate = LocalDate.now(),
        zone: ZoneId = ZoneId.systemDefault()
    ): TicketData? {
        val lines = sales.filter { it.type == MovementType.VENTA }
        if (lines.isEmpty()) return null
        return TicketData(
            businessName = businessName.ifBlank { "NovaGest" },
            date = date.format(dayFmt),
            time = Instant.ofEpochMilli(lines.maxOf { it.dateEpoch }).atZone(zone).format(timeFmt),
            lines = lines.map { TicketLine(it.productName.ifBlank { "Producto" }, it.quantity, it.unitPriceUsd, it.importeUsd) },
            totalUsd = lines.sumOf { it.importeUsd },
            rateCupUsd = rateCupUsd,
            paymentType = if (lines.any { it.notes.contains("fiado", true) }) "FIADO" else "CONTADO",
            seller = lines.firstOrNull()?.userName ?: "",
            width = width
        )
    }

    /* ------------------------- memoria del último ticket ------------------------- */

    private const val SEP = "\u001f"
    private const val ROW = "\u001e"

    /** Serializa el ticket para guardarlo en las preferencias del teléfono. */
    fun encode(ticket: TicketData): String = listOf(
        ticket.businessName, ticket.date, ticket.time, ticket.totalUsd.toString(),
        ticket.rateCupUsd.toString(), ticket.paymentType, ticket.customer, ticket.seller,
        ticket.width.name
    ).joinToString(SEP) { clean(it) } + ROW + ticket.lines.joinToString(ROW) {
        listOf(it.name, it.qty.toString(), it.unitUsd.toString(), it.totalUsd.toString()).joinToString(SEP) { v -> clean(v) }
    }

    /** Recupera el ticket guardado; null si el texto no es válido. */
    fun decode(text: String?): TicketData? {
        if (text.isNullOrBlank()) return null
        val parts = text.split(ROW)
        val head = parts.firstOrNull()?.split(SEP) ?: return null
        if (head.size < 9) return null
        val lines = parts.drop(1).mapNotNull { row ->
            val cell = row.split(SEP)
            if (cell.size < 4) return@mapNotNull null
            TicketLine(
                name = cell[0],
                qty = cell[1].toDoubleOrNull() ?: return@mapNotNull null,
                unitUsd = cell[2].toDoubleOrNull() ?: return@mapNotNull null,
                totalUsd = cell[3].toDoubleOrNull() ?: return@mapNotNull null
            )
        }
        if (lines.isEmpty()) return null
        return TicketData(
            businessName = head[0],
            date = head[1],
            time = head[2],
            lines = lines,
            totalUsd = head[3].toDoubleOrNull() ?: return null,
            rateCupUsd = head[4].toDoubleOrNull() ?: 0.0,
            paymentType = head[5],
            customer = head[6],
            seller = head[7],
            width = if (head[8] == PaperWidth.MM_80.name) PaperWidth.MM_80 else PaperWidth.MM_58
        )
    }

    /** Sustituye los separadores internos para que el texto guardado no se rompa. */
    private fun clean(value: String): String = value.replace(SEP, " ").replace(ROW, " ")
}
