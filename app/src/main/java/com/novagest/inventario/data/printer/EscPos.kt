package com.novagest.inventario.data.printer

/**
 * Ancho del papel de la impresora térmica, en columnas de texto.
 *
 * 58 mm suele dar 32 columnas y 80 mm, 48: es lo que cabe con la fuente A
 * estándar de ESC/POS.
 */
enum class PaperWidth(val columns: Int, val label: String) {
    MM_58(32, "58 mm"),
    MM_80(48, "80 mm")
}

/** Una línea del ticket: producto, cantidad y precio. */
data class TicketLine(
    val name: String,
    val qty: Double,
    val unitUsd: Double,
    val totalUsd: Double
)

/** Todo lo que se imprime en un ticket de venta. */
data class TicketData(
    val businessName: String,
    val date: String,
    val time: String,
    val lines: List<TicketLine>,
    val totalUsd: Double,
    val rateCupUsd: Double = 0.0,
    val paymentType: String = "CONTADO",
    val customer: String = "",
    val seller: String = "",
    val width: PaperWidth = PaperWidth.MM_58
) {
    val totalCup: Double get() = if (rateCupUsd > 0) totalUsd * rateCupUsd else 0.0
}

/**
 * Generador de comandos ESC/POS (W-… · recibo Bluetooth).
 *
 * Sin dependencias de Android: solo construye el flujo de bytes que entienden
 * las impresoras térmicas de 58 y 80 mm. Así se puede probar en la máquina de
 * desarrollo, sin impresora.
 *
 * Las impresoras trabajan en ASCII, así que los acentos se pliegan (`á` → `a`)
 * en lugar de salir como símbolos raros.
 */
object EscPos {
    /** Reinicia la impresora. */
    val INIT: ByteArray = byteArrayOf(0x1B, 0x40)

    private val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
    private val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
    private val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
    private val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
    private val BIG_ON = byteArrayOf(0x1D, 0x21, 0x11)
    private val BIG_OFF = byteArrayOf(0x1D, 0x21, 0x00)
    private val CUT = byteArrayOf(0x1D, 0x56, 0x42, 0x00)

    private fun feed(lines: Int): ByteArray = byteArrayOf(0x1B, 0x64, lines.coerceIn(0, 255).toByte())

    private val ACENTOS = mapOf(
        'á' to "a", 'à' to "a", 'ä' to "a", 'â' to "a", 'ã' to "a", 'Á' to "A", 'À' to "A",
        'Ä' to "A", 'Â' to "A", 'Ã' to "A", 'é' to "e", 'è' to "e", 'ë' to "e", 'ê' to "e",
        'É' to "E", 'È' to "E", 'Ë' to "E", 'Ê' to "E", 'í' to "i", 'ì' to "i", 'ï' to "i",
        'î' to "i", 'Í' to "I", 'Ì' to "I", 'Ï' to "I", 'Î' to "I", 'ó' to "o", 'ò' to "o",
        'ö' to "o", 'ô' to "o", 'õ' to "o", 'Ó' to "O", 'Ò' to "O", 'Ö' to "O", 'Ô' to "O",
        'Õ' to "O", 'ú' to "u", 'ù' to "u", 'ü' to "u", 'û' to "u", 'Ú' to "U", 'Ù' to "U",
        'Ü' to "U", 'Û' to "U", 'ñ' to "n", 'Ñ' to "N", 'ç' to "c", 'Ç' to "C",
        'º' to "o", 'ª' to "a", '€' to "EUR", '´' to "'", '`' to "'",
        '—' to "-", '–' to "-", '…' to "...", '“' to "\"", '”' to "\"", '‘' to "'", '’' to "'"
    )

    /** Pasa el texto a ASCII imprimible: pliega acentos y descarta lo que no cabe. */
    fun fold(text: String): String {
        val out = StringBuilder(text.length)
        for (ch in text) {
            when {
                ch in ACENTOS -> out.append(ACENTOS.getValue(ch))
                ch == '\n' || ch == '\t' -> out.append(' ')
                ch.code in 32..126 -> out.append(ch)
                else -> out.append('?')
            }
        }
        return out.toString()
    }

    /** Importe con dos decimales y punto, como en la caja. */
    fun money(value: Double): String = String.format(java.util.Locale.US, "%.2f", value)

    /** Cantidad sin decimales innecesarios (`2`, `2.5`). */
    fun qty(value: Double): String =
        if (value == value.toLong().toDouble()) value.toLong().toString() else money(value)

    /** Texto a la izquierda e importe a la derecha, con relleno de espacios. */
    fun padLine(left: String, right: String, columns: Int): String {
        val l = fold(left).trim()
        val r = fold(right).trim()
        val space = columns - l.length - r.length
        if (space >= 1) return l + " ".repeat(space) + r
        val room = (columns - r.length - 1).coerceAtLeast(0)
        val cut = if (l.length > room) l.substring(0, room) else l
        return cut.padEnd(columns - r.length) + r
    }

    /** Línea separadora. */
    fun divider(columns: Int): String = "-".repeat(columns)

    /** Texto centrado (para el encabezado y el pie). */
    fun centered(text: String, columns: Int): String {
        val t = fold(text).trim()
        if (t.length >= columns) return t.take(columns)
        val pad = (columns - t.length) / 2
        return " ".repeat(pad) + t
    }

    /**
     * Construye el ticket completo: inicializa, imprime encabezado, líneas,
     * totales, pie, avanza el papel y corta.
     */
    fun build(ticket: TicketData): ByteArray {
        val cols = ticket.width.columns
        val out = java.io.ByteArrayOutputStream()

        fun write(bytes: ByteArray) = out.write(bytes, 0, bytes.size)
        fun line(text: String = "") = write((fold(text) + "\n").toByteArray(Charsets.US_ASCII))

        write(INIT)
        write(ALIGN_CENTER)
        write(BOLD_ON)
        write(BIG_ON)
        line(ticket.businessName.ifBlank { "NovaGest" })
        write(BIG_OFF)
        write(BOLD_OFF)
        line("Ticket de venta")
        line("${ticket.date} ${ticket.time}".trim())

        write(ALIGN_LEFT)
        line(divider(cols))
        for (l in ticket.lines) {
            line(padLine("${qty(l.qty)} x ${l.name}", money(l.totalUsd), cols))
        }
        line(divider(cols))

        write(BOLD_ON)
        line(padLine("TOTAL USD", money(ticket.totalUsd), cols))
        write(BOLD_OFF)
        if (ticket.rateCupUsd > 0) line(padLine("Equivalente CUP", money(ticket.totalCup), cols))
        line(padLine("Pago", if (ticket.paymentType.equals("FIADO", true)) "Fiado" else "Contado", cols))
        if (ticket.customer.isNotBlank()) line(padLine("Cliente", ticket.customer, cols))
        if (ticket.seller.isNotBlank()) line(padLine("Atendio", ticket.seller, cols))

        line(divider(cols))
        write(ALIGN_CENTER)
        line("Gracias por su compra")
        line("NovaGest")
        write(ALIGN_LEFT)
        write(feed(3))
        write(CUT)
        return out.toByteArray()
    }
}
