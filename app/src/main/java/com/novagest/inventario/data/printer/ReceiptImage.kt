package com.novagest.inventario.data.printer

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * A-19 · Dibuja el ticket como imagen y lo comparte.
 *
 * La parte de cálculo y de texto vive en [ReceiptShare] (probada sin Android). Aquí
 * solo está lo que necesita el teléfono: pintar el PNG, guardarlo en la caché y armar
 * el `Intent` para el selector de aplicaciones (WhatsApp, Telegram, correo…).
 *
 * La imagen se guarda en `cache/tickets/` y se comparte con el `FileProvider` que ya
 * usa la app para las exportaciones: no hay permisos nuevos ni archivos sueltos.
 */
object ReceiptImage {

    private const val WIDTH = 720
    private const val PADDING = 30f
    private const val INK = 0xFF111827.toInt()
    private const val MUTED = 0xFF6B7280.toInt()
    private const val LINE = 0xFFE5E7EB.toInt()

    /** Una línea del dibujo: texto a la izquierda y, si se quiere, importe a la derecha. */
    private data class Row(
        val left: String,
        val right: String = "",
        val bold: Boolean = false,
        val size: Float = 26f,
        val color: Int = INK,
        val center: Boolean = false,
        val gap: Float = 10f
    )

    private fun paint(size: Float, bold: Boolean = false, color: Int = INK): Paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            textSize = size
            typeface = Typeface.create(Typeface.MONOSPACE, if (bold) Typeface.BOLD else Typeface.NORMAL)
        }

    /** Filas del ticket, en orden. Se separa del dibujo para calcular la altura. */
    private fun rows(ticket: TicketData): List<Row> {
        val filas = mutableListOf<Row>()
        filas += Row(ticket.businessName.ifBlank { ReceiptShare.DEFAULT_BUSINESS }, bold = true, size = 34f, center = true, gap = 6f)
        filas += Row("${ticket.date}  ${ticket.time}", size = 24f, color = MUTED, center = true, gap = 18f)
        for (l in ticket.lines) {
            filas += Row(
                left = "${com.novagest.inventario.util.Money.qty(l.qty)} × ${l.name}",
                right = com.novagest.inventario.util.Money.usd(l.totalUsd),
                gap = 6f
            )
        }
        filas += Row("", gap = 14f)
        filas += Row("TOTAL", com.novagest.inventario.util.Money.usd(ticket.totalUsd), bold = true, size = 32f, gap = 8f)
        if (ticket.rateCupUsd > 0) {
            filas += Row(
                "Tasa ${com.novagest.inventario.util.Money.qty(ticket.rateCupUsd)}",
                com.novagest.inventario.util.Money.cup(ticket.totalUsd * ticket.rateCupUsd),
                size = 22f, color = MUTED
            )
        }
        filas += Row("", gap = 12f)
        filas += Row("Pago", ticket.paymentType.ifBlank { "CONTADO" }, size = 24f, gap = 6f)
        if (ticket.customer.isNotBlank()) filas += Row("Cliente", ticket.customer, size = 24f, gap = 6f)
        if (ticket.seller.isNotBlank()) filas += Row("Atendido por", ticket.seller, size = 24f, gap = 6f)
        filas += Row("", gap = 16f)
        filas += Row("Gracias por su compra", size = 22f, color = MUTED, center = true, gap = 6f)
        return filas
    }

    /** Dibuja el ticket en un `Bitmap` vertical con fondo blanco. */
    fun render(ticket: TicketData): Bitmap {
        val filas = rows(ticket)
        val alto = (PADDING * 2 + filas.sumOf { (it.size + it.gap).toDouble() }).toInt().coerceAtLeast(200)
        val bmp = Bitmap.createBitmap(WIDTH, alto, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.WHITE)
        var y = PADDING
        for (f in filas) {
            val p = paint(f.size, f.bold, f.color)
            y += f.size
            if (f.center) {
                canvas.drawText(f.left, (WIDTH - p.measureText(f.left)) / 2f, y, p)
            } else {
                val derecha = if (f.right.isBlank()) 0f else p.measureText(f.right)
                val anchoIzq = WIDTH - PADDING * 2 - derecha - 16f
                canvas.drawText(recortar(f.left, p, anchoIzq), PADDING, y, p)
                if (f.right.isNotBlank()) canvas.drawText(f.right, WIDTH - PADDING - derecha, y, p)
            }
            y += f.gap
        }
        // Línea de cierre
        val linea = paint(1f, color = LINE)
        canvas.drawLine(PADDING, y + 4f, WIDTH - PADDING, y + 4f, linea)
        return bmp
    }

    /** Recorta con puntos suspensivos si el nombre no cabe en su columna. */
    private fun recortar(texto: String, p: Paint, ancho: Float): String {
        if (p.measureText(texto) <= ancho) return texto
        var corte = texto.length
        while (corte > 1 && p.measureText(texto.take(corte) + "…") > ancho) corte--
        return texto.take(corte) + "…"
    }

    /** Guarda el PNG en `cache/tickets/` y devuelve el archivo. */
    fun save(context: Context, ticket: TicketData, fileName: String): File {
        val carpeta = File(context.cacheDir, "tickets").apply { mkdirs() }
        val archivo = File(carpeta, fileName.ifBlank { "ticket.png" })
        FileOutputStream(archivo).use { out ->
            render(ticket).compress(Bitmap.CompressFormat.PNG, 100, out)
        }
        return archivo
    }

    /** URI segura para compartir el archivo con otra aplicación. */
    fun uriFor(context: Context, file: File): Uri =
        FileProvider.getUriForFile(context, context.packageName + ".files", file)

    /** Intent con la imagen **y** el texto; WhatsApp pone el texto como pie de la imagen. */
    fun shareIntent(context: Context, payload: ReceiptShare.SharePayload): Intent {
        val archivo = save(context, payload.ticket, payload.fileName)
        val uri = uriFor(context, archivo)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, payload.text)
            putExtra(Intent.EXTRA_SUBJECT, "Ticket ${payload.ticket.businessName.ifBlank { "NovaGest" }}")
            clipData = ClipData.newUri(context.contentResolver, "ticket", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return Intent.createChooser(send, "Compartir el ticket")
    }

    /** Abre el selector de aplicaciones con la imagen y el texto. */
    fun share(context: Context, payload: ReceiptShare.SharePayload) {
        context.startActivity(shareIntent(context, payload))
    }

    /**
     * Abre WhatsApp con el texto ya escrito (sin imagen). Funciona también si no hay
     * WhatsApp instalado: el sistema abre el enlace en el navegador.
     */
    fun shareText(context: Context, payload: ReceiptShare.SharePayload) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(payload.whatsappUrl))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
