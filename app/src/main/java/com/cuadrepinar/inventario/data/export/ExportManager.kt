package com.cuadrepinar.inventario.data.export

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import com.cuadrepinar.inventario.domain.model.ComprobacionRow
import com.cuadrepinar.inventario.domain.model.CuadreTotals
import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.Product
import com.cuadrepinar.inventario.util.Dates
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExportManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private fun dir(): File = File(context.filesDir, "exports").apply { mkdirs() }

    fun csvProducts(products: List<Product>): File {
        val sb = StringBuilder("PRODUCTOS,STOCK INICIAL,STOCK ACTUAL,PRECIO VENTA (USD),P. COSTO (USD),COMISION (CUP),CATEGORIA\n")
        products.forEach {
            sb.append(listOf(it.name, it.stockInicial, it.stockActual, it.precioVentaUsd, it.precioCostoUsd, it.comisionCup, it.category).joinToString(",") { v -> csv(v) }).append('\n')
        }
        return write("inventario_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun csvMovements(movs: List<Movement>): File {
        val sb = StringBuilder("FECHA,PRODUCTO,MOVIMIENTO,CANTIDAD,PRECIO VENTA USD,IMPORTE USD,COSTO UNITARIO USD,COSTO VENTA USD,UTILIDAD BRUTA USD,TIPO,COMISION CUP,STOCK INICIAL,STOCK FINAL,USUARIO\n")
        movs.forEach {
            val cost = if (it.type == com.cuadrepinar.inventario.domain.model.MovementType.VENTA) it.quantity * it.unitCostUsd else 0.0
            sb.append(
                listOf(
                    Dates.format(it.dateEpoch), it.productName, it.type.name, it.quantity, it.unitPriceUsd,
                    it.importeUsd, it.unitCostUsd, cost, it.importeUsd - cost, it.center.name, it.comisionCup,
                    it.stockInicial, it.stockFinal, it.userName
                ).joinToString(",") { v -> csv(v) }
            ).append('\n')
        }
        return write("movimientos_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun csvComprobacion(rows: List<ComprobacionRow>): File {
        val sb = StringBuilder("PRODUCTOS,STOCK INICIAL,VENTAS,ENTRADAS,SALIDAS,STOCK CALCULADO,STOCK FINAL,PRECIO VENTA,IMPORTE PRECIO ORIGINAL,IMPORTE REAL,COSTO HISTORICO,UTILIDAD BRUTA,COMISION CUP,DIFERENCIA DE IMPORTE\n")
        rows.forEach {
            sb.append(
                listOf(
                    it.product, it.stockInicial, it.ventas, it.entradas, it.salidas, it.stockCalculado,
                    it.stockFinal, it.precioVenta, it.importeOriginal, it.importeReal, it.costoVentas,
                    it.utilidadBruta, it.comisionesCup, it.diferenciaImporte
                ).joinToString(",") { v -> csv(v) }
            ).append('\n')
        }
        return write("comprobacion_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun xlsxComprobacion(rows: List<ComprobacionRow>): File {
        val headers = listOf(
            "PRODUCTOS", "STOCK INICIAL", "VENTAS", "ENTRADAS", "SALIDAS", "STOCK CALCULADO",
            "STOCK FINAL", "PRECIO VENTA", "IMPORTE PRECIO ORIGINAL", "IMPORTE REAL", "COSTO HISTORICO",
            "UTILIDAD BRUTA", "COMISION CUP", "DIFERENCIA DE IMPORTE"
        )
        val data = rows.map {
            listOf(
                it.product, it.stockInicial, it.ventas, it.entradas, it.salidas, it.stockCalculado,
                it.stockFinal, it.precioVenta, it.importeOriginal, it.importeReal, it.costoVentas,
                it.utilidadBruta, it.comisionesCup, it.diferenciaImporte
            )
        }
        return writeXlsx("comprobacion_${ts()}.xlsx", "COMPROBACION", headers, data)
    }

    fun pdfCuadre(cuadre: DailyCuadre, totals: CuadreTotals, movs: List<Movement>): File {
        val document = PdfDocument()
        val width = 595
        val height = 842
        val left = 38f
        val right = width - left
        val contentWidth = right - left
        val safeDate = Dates.toLocalDate(cuadre.dateEpoch).toString()
        var pageNumber = 0
        var page: PdfDocument.Page? = null
        var y = 0f

        fun finishPage() {
            val current = page ?: return
            drawPdfFooter(current.canvas, pageNumber, width.toFloat(), height.toFloat())
            document.finishPage(current)
            page = null
        }

        fun startPage(first: Boolean) {
            pageNumber++
            page = document.startPage(PdfDocument.PageInfo.Builder(width, height, pageNumber).create())
            val canvas = page!!.canvas
            drawPdfHeader(
                canvas = canvas,
                width = width.toFloat(),
                title = if (first) "CUADRE DIARIO" else "CUADRE DIARIO · CONTINUACIÓN",
                subtitle = "${cuadre.weekday.replaceFirstChar { it.uppercase() }} · ${Dates.formatLong(cuadre.dateEpoch)}",
                pageNumber = pageNumber,
                compact = !first
            )
            y = if (first) 124f else 78f
        }

        try {
            startPage(first = true)
            val canvas = page!!.canvas
            val metrics = listOf(
                Triple("VENTA TOTAL", Money.usd(totals.ventaTotal), pdfTeal),
                Triple("COBROS EN USD", Money.usd(totals.cobrosUsd), pdfBlue),
                Triple("ENTRADA DE DINERO", Money.usd(totals.entradaDineroUsd), pdfBlue),
                Triple("EXTRACCIÓN", Money.usd(totals.extraccionTotalUsd), pdfGold),
                Triple("TOTAL GENERAL", Money.usd(totals.totalGeneral), pdfTeal),
                Triple("DIFERENCIA", Money.usd(totals.diferenciaUsd), if (kotlin.math.abs(totals.diferenciaUsd) < 0.005) pdfGreen else pdfRed)
            )
            val gap = 9f
            val cardWidth = (contentWidth - gap * 2) / 3f
            metrics.forEachIndexed { index, (label, value, accent) ->
                val row = index / 3
                val column = index % 3
                val x = left + column * (cardWidth + gap)
                val top = 124f + row * 59f
                drawPdfKpi(canvas, x, top, cardWidth, 51f, label, value, accent)
            }
            y = 253f
            y = drawPdfSectionTitle(canvas, "DETALLE DEL CIERRE", left, y, contentWidth)
            val leftDetails = listOf(
                "Tasa CUP/USD" to "${Money.qty(cuadre.cupUsd)} CUP",
                "USD / Zelle cobrados" to "${Money.usd(cuadre.cobroUsd)} / ${Money.usd(cuadre.cobroZelle)}",
                "Cobro CUP efectivo" to Money.cup(cuadre.cobroCupEfectivo),
                "Fondo inicial CUP" to Money.cup(cuadre.fondoInicialCup),
                "Entrada de dinero" to "${Money.cup(cuadre.entradaCup)} · ${Money.usd(cuadre.entradaUsd)}",
                "Domicilio + cambio CUP" to Money.cup(cuadre.domicilioCup + cuadre.cambioCup),
                "Domicilio USD" to Money.usd(cuadre.domicilioUsd),
            )
            val rightDetails = listOf(
                "Tasa MXN/USD" to "${Money.qty(cuadre.mxnUsd)} MXN",
                "MXN / Europa cobrados" to "${Money.qty(cuadre.cobroMxn)} MXN · ${Money.usd(cuadre.cobroEuropa)}",
                "Cobro CUP transferencia" to Money.cup(cuadre.cobroCupTransf),
                "Fondo inicial USD" to Money.usd(cuadre.fondoInicialUsd),
                "Extracción" to "${Money.cup(cuadre.extraccionCup)} · ${Money.usd(cuadre.extraccionUsd)}",
                "Comisiones + otros CUP" to Money.cup(cuadre.comisionesCup + cuadre.otrosGastosCup),
                "Comisiones + otros USD" to Money.usd(cuadre.comisionesUsd + cuadre.otrosGastosUsd),
            )
            val detailGap = 18f
            leftDetails.indices.forEach { index ->
                val baseline = y + 11f
                drawPdfLabelValue(canvas, leftDetails[index].first, leftDetails[index].second, left, left + contentWidth / 2f - 8f, baseline)
                drawPdfLabelValue(canvas, rightDetails[index].first, rightDetails[index].second, left + contentWidth / 2f + 8f, right, baseline)
                y += detailGap
            }
            y += 7f
            y = drawPdfSectionTitle(canvas, "MOVIMIENTOS DEL DÍA · ${movs.size}", left, y, contentWidth)
            y = drawCuadreMovementHeader(canvas, left, y, right)

            if (movs.isEmpty()) {
                drawPdfText(canvas, "No hay movimientos registrados para esta fecha.", left + 6f, y + 14f, pdfText(9f, pdfMuted))
            } else {
                movs.forEachIndexed { index, movement ->
                    val note = movement.notes.trim()
                    val rowHeight = if (note.isBlank()) 23f else 31f
                    if (y + rowHeight > height - 44f) {
                        finishPage()
                        startPage(first = false)
                        y = drawCuadreMovementHeader(page!!.canvas, left, y, right)
                    }
                    val rowCanvas = page!!.canvas
                    if (index % 2 == 1) {
                        rowCanvas.drawRect(left, y, right, y + rowHeight, pdfFill(pdfLight))
                    }
                    val primary = pdfText(8.6f, pdfInk)
                    val secondary = pdfText(7.2f, pdfMuted)
                    drawPdfTextFit(rowCanvas, movement.productName, left + 6f, y + 12f, 204f, primary)
                    if (note.isNotBlank()) drawPdfTextFit(rowCanvas, note, left + 6f, y + 24f, 204f, secondary)
                    drawPdfTextFit(rowCanvas, movement.type.name, left + 216f, y + 14f, 64f, pdfText(7.4f, pdfInk, bold = true))
                    drawPdfRightText(rowCanvas, Money.qty(movement.quantity), left + 340f, y + 14f, 55f, pdfText(8f, pdfInk))
                    drawPdfTextFit(rowCanvas, movement.center.name, left + 346f, y + 14f, 64f, pdfText(7.4f, pdfInk))
                    val amount = if (movement.type.name == "VENTA") Money.usd(movement.importeUsd) else "—"
                    drawPdfRightText(rowCanvas, amount, right - 5f, y + 14f, 90f, pdfText(8f, pdfInk, bold = movement.type.name == "VENTA"))
                    rowCanvas.drawLine(left, y + rowHeight, right, y + rowHeight, pdfStroke(pdfLine, 0.45f))
                    y += rowHeight
                }
            }
            finishPage()
            val file = File(dir(), "cuadre_${safeDate}_${ts()}.pdf")
            FileOutputStream(file).use { document.writeTo(it) }
            return file
        } finally {
            document.close()
        }
    }

    fun pdfComprobacion(rows: List<ComprobacionRow>, period: String, fromEpoch: Long, toEpoch: Long): File {
        val document = PdfDocument()
        val width = 842
        val height = 595
        val left = 29f
        val right = width - left
        val widths = listOf(170f, 42f, 38f, 38f, 38f, 43f, 43f, 48f, 52f, 52f, 48f, 50f, 51f, 50f)
        val headers = listOf("PRODUCTO", "STOCK INI.", "VENTAS", "ENTRADAS", "SALIDAS", "STOCK CALC.", "STOCK FIN.", "P. VENTA", "IMP. ORIG.", "IMP. REAL", "COSTO", "UTILIDAD", "COMISIÓN CUP", "DIF.")
        val periodLabel = period.replaceFirstChar { it.uppercase() }
        val fromDate = Dates.format(fromEpoch)
        val toDate = Dates.format(toEpoch)
        val safePeriod = period.replace(Regex("[^A-Za-z0-9_-]+"), "_").lowercase()
        var pageNumber = 0
        var page: PdfDocument.Page? = null
        var y = 0f

        fun finishPage() {
            val current = page ?: return
            drawPdfFooter(current.canvas, pageNumber, width.toFloat(), height.toFloat())
            document.finishPage(current)
            page = null
        }

        fun drawTableHeader(startY: Float): Float {
            val canvas = page!!.canvas
            canvas.drawRoundRect(RectF(left, startY, right, startY + 27f), 4f, 4f, pdfFill(pdfLight))
            var x = left + 4f
            headers.forEachIndexed { index, text ->
                val maxWidth = widths[index] - 8f
                if (index == 0) drawPdfTextFit(canvas, text, x, startY + 17f, maxWidth, pdfText(6.5f, pdfInk, bold = true))
                else drawPdfRightText(canvas, text, x + widths[index] - 4f, startY + 17f, maxWidth, pdfText(6.2f, pdfInk, bold = true))
                x += widths[index]
            }
            return startY + 30f
        }

        try {
            fun startPage(first: Boolean) {
                pageNumber++
                page = document.startPage(PdfDocument.PageInfo.Builder(width, height, pageNumber).create())
                drawPdfHeader(
                    canvas = page!!.canvas,
                    width = width.toFloat(),
                    title = if (first) "COMPROBACIÓN DE INVENTARIO" else "COMPROBACIÓN · CONTINUACIÓN",
                    subtitle = "$periodLabel · $fromDate – $toDate",
                    pageNumber = pageNumber,
                    compact = !first
                )
                if (first) {
                    val canvas = page!!.canvas
                    val metrics = listOf(
                        "VENTAS" to Money.qty(rows.sumOf { it.ventas }),
                        "ENTRADAS" to Money.qty(rows.sumOf { it.entradas }),
                        "SALIDAS" to Money.qty(rows.sumOf { it.salidas }),
                        "IMPORTE REAL" to Money.usd(rows.sumOf { it.importeReal }),
                        "COSTO" to Money.usd(rows.sumOf { it.costoVentas }),
                        "UTILIDAD" to Money.usd(rows.sumOf { it.utilidadBruta }),
                        "DIFERENCIA" to Money.usd(rows.sumOf { it.diferenciaImporte }),
                    )
                    val gap = 8f
                    val cardWidth = (right - left - gap * (metrics.size - 1)) / metrics.size
                    metrics.forEachIndexed { index, (label, value) ->
                        val accent = when (index) {
                            5 -> pdfGreen
                            6 -> pdfGold
                            else -> pdfTeal
                        }
                        drawPdfKpi(canvas, left + index * (cardWidth + gap), 100f, cardWidth, 43f, label, value, accent)
                    }
                    y = drawPdfSectionTitle(canvas, "DETALLE POR PRODUCTO · ${rows.size} FILAS", left, 159f, right - left)
                } else {
                    y = 76f
                    y = drawPdfSectionTitle(page!!.canvas, "DETALLE POR PRODUCTO · CONTINUACIÓN", left, y, right - left)
                }
                y = drawTableHeader(y)
            }

            startPage(first = true)
            if (rows.isEmpty()) {
                drawPdfText(page!!.canvas, "No hay productos con movimientos en este período.", left + 6f, y + 14f, pdfText(9f, pdfMuted))
            } else {
                rows.forEachIndexed { index, row ->
                    if (y + 19f > height - 38f) {
                        finishPage()
                        startPage(first = false)
                    }
                    val canvas = page!!.canvas
                    if (index % 2 == 1) canvas.drawRect(left, y, right, y + 19f, pdfFill(pdfOffWhite))
                    val values = listOf(
                        row.product,
                        Money.qty(row.stockInicial), Money.qty(row.ventas), Money.qty(row.entradas), Money.qty(row.salidas),
                        Money.qty(row.stockCalculado), Money.qty(row.stockFinal), Money.usd(row.precioVenta),
                        Money.usd(row.importeOriginal), Money.usd(row.importeReal), Money.usd(row.costoVentas),
                        Money.usd(row.utilidadBruta), Money.cup(row.comisionesCup), Money.usd(row.diferenciaImporte)
                    )
                    var x = left + 4f
                    values.forEachIndexed { column, value ->
                        val maxWidth = widths[column] - 8f
                        if (column == 0) drawPdfTextFit(canvas, value, x, y + 13f, maxWidth, pdfText(7.4f, pdfInk))
                        else drawPdfRightText(canvas, value, x + widths[column] - 4f, y + 13f, maxWidth, pdfText(7f, pdfInk))
                        x += widths[column]
                    }
                    canvas.drawLine(left, y + 19f, right, y + 19f, pdfStroke(pdfLine, 0.4f))
                    y += 19f
                }
                if (y + 22f > height - 38f) {
                    finishPage()
                    startPage(first = false)
                }
                val totals = listOf(
                    "TOTAL", Money.qty(rows.sumOf { it.stockInicial }), Money.qty(rows.sumOf { it.ventas }),
                    Money.qty(rows.sumOf { it.entradas }), Money.qty(rows.sumOf { it.salidas }),
                    Money.qty(rows.sumOf { it.stockCalculado }), Money.qty(rows.sumOf { it.stockFinal }), "—",
                    Money.usd(rows.sumOf { it.importeOriginal }), Money.usd(rows.sumOf { it.importeReal }),
                    Money.usd(rows.sumOf { it.costoVentas }), Money.usd(rows.sumOf { it.utilidadBruta }),
                    Money.cup(rows.sumOf { it.comisionesCup }), Money.usd(rows.sumOf { it.diferenciaImporte })
                )
                val canvas = page!!.canvas
                canvas.drawRect(left, y, right, y + 21f, pdfFill(pdfLight))
                var x = left + 4f
                totals.forEachIndexed { column, value ->
                    if (column == 0) drawPdfTextFit(canvas, value, x, y + 14f, widths[column] - 8f, pdfText(7.2f, pdfInk, bold = true))
                    else drawPdfRightText(canvas, value, x + widths[column] - 4f, y + 14f, widths[column] - 8f, pdfText(6.8f, pdfInk, bold = true))
                    x += widths[column]
                }
            }
            finishPage()
            val file = File(dir(), "comprobacion_${safePeriod}_${ts()}.pdf")
            FileOutputStream(file).use { document.writeTo(it) }
            return file
        } finally {
            document.close()
        }
    }

    private val pdfNavy = Color.rgb(16, 35, 52)
    private val pdfTeal = Color.rgb(16, 123, 116)
    private val pdfBlue = Color.rgb(54, 101, 139)
    private val pdfGold = Color.rgb(188, 132, 33)
    private val pdfGreen = Color.rgb(35, 126, 88)
    private val pdfRed = Color.rgb(176, 60, 55)
    private val pdfInk = Color.rgb(31, 43, 52)
    private val pdfMuted = Color.rgb(100, 113, 122)
    private val pdfLine = Color.rgb(220, 227, 231)
    private val pdfLight = Color.rgb(239, 244, 246)
    private val pdfOffWhite = Color.rgb(249, 251, 252)

    private fun pdfText(size: Float, color: Int, bold: Boolean = false): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        textSize = size
        typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
    }

    private fun pdfFill(color: Int): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        style = Paint.Style.FILL
    }

    private fun pdfStroke(color: Int, width: Float = 1f): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        style = Paint.Style.STROKE
        strokeWidth = width
    }

    private fun drawPdfText(canvas: Canvas, text: String, x: Float, baseline: Float, paint: Paint) {
        canvas.drawText(text, x, baseline, paint)
    }

    private fun drawPdfTextFit(canvas: Canvas, text: String, x: Float, baseline: Float, maxWidth: Float, paint: Paint) {
        val safeWidth = maxWidth.coerceAtLeast(0f)
        var display = text.replace('\n', ' ').trim()
        if (paint.measureText(display) > safeWidth) {
            val suffix = "…"
            while (display.isNotEmpty() && paint.measureText(display + suffix) > safeWidth) {
                display = display.dropLast(1)
            }
            display = if (display.isEmpty()) "" else display + suffix
        }
        canvas.drawText(display, x, baseline, paint)
    }

    private fun drawPdfRightText(canvas: Canvas, text: String, right: Float, baseline: Float, maxWidth: Float, paint: Paint) {
        var display = text.trim()
        if (paint.measureText(display) > maxWidth) {
            val suffix = "…"
            while (display.isNotEmpty() && paint.measureText(display + suffix) > maxWidth) {
                display = display.dropLast(1)
            }
            display = if (display.isEmpty()) "" else display + suffix
        }
        canvas.drawText(display, right - paint.measureText(display), baseline, paint)
    }

    private fun drawPdfHeader(canvas: Canvas, width: Float, title: String, subtitle: String, pageNumber: Int, compact: Boolean) {
        val bandHeight = if (compact) 66f else 94f
        canvas.drawRect(0f, 0f, width, bandHeight, pdfFill(pdfNavy))
        canvas.drawRect(0f, 0f, 6f, bandHeight, pdfFill(pdfTeal))
        drawPdfText(canvas, "CUADRE PINAR", 35f, 22f, pdfText(8.5f, Color.rgb(171, 218, 213), bold = true))
        drawPdfTextFit(canvas, title, 35f, if (compact) 44f else 52f, width - 135f, pdfText(if (compact) 16f else 21f, Color.WHITE, bold = true))
        drawPdfTextFit(canvas, subtitle, 35f, if (compact) 58f else 74f, width - 120f, pdfText(8f, Color.rgb(220, 230, 236)))
        val badge = RectF(width - 91f, 17f, width - 27f, 39f)
        canvas.drawRoundRect(badge, 11f, 11f, pdfFill(pdfTeal))
        val badgeText = "PDF · $pageNumber"
        val badgePaint = pdfText(7f, Color.WHITE, bold = true)
        canvas.drawText(badgeText, badge.centerX() - badgePaint.measureText(badgeText) / 2f, badge.centerY() + 2.5f, badgePaint)
    }

    private fun drawPdfFooter(canvas: Canvas, pageNumber: Int, width: Float, height: Float) {
        canvas.drawLine(30f, height - 29f, width - 30f, height - 29f, pdfStroke(pdfLine, 0.8f))
        drawPdfText(canvas, "Cuadre Pinar · Informe generado desde la aplicación", 30f, height - 14f, pdfText(7f, pdfMuted))
        drawPdfRightText(canvas, "PÁGINA $pageNumber", width - 30f, height - 14f, 75f, pdfText(7f, pdfMuted, bold = true))
    }

    private fun drawPdfKpi(canvas: Canvas, x: Float, y: Float, width: Float, height: Float, label: String, value: String, accent: Int) {
        canvas.drawRoundRect(RectF(x, y, x + width, y + height), 6f, 6f, pdfFill(pdfOffWhite))
        canvas.drawRoundRect(RectF(x, y, x + 3f, y + height), 2f, 2f, pdfFill(accent))
        canvas.drawRoundRect(RectF(x, y, x + width, y + height), 6f, 6f, pdfStroke(pdfLine, 0.65f))
        drawPdfTextFit(canvas, label, x + 10f, y + 17f, width - 17f, pdfText(7f, pdfMuted, bold = true))
        drawPdfTextFit(canvas, value, x + 10f, y + height - 12f, width - 17f, pdfText(11.5f, pdfInk, bold = true))
    }

    private fun drawPdfSectionTitle(canvas: Canvas, title: String, x: Float, y: Float, width: Float): Float {
        drawPdfTextFit(canvas, title, x, y, width, pdfText(9f, pdfBlue, bold = true))
        canvas.drawLine(x, y + 5f, x + width, y + 5f, pdfStroke(pdfLine, 0.7f))
        return y + 17f
    }

    private fun drawPdfLabelValue(canvas: Canvas, label: String, value: String, left: Float, right: Float, baseline: Float) {
        val width = (right - left).coerceAtLeast(0f)
        drawPdfTextFit(canvas, label, left, baseline, width * 0.58f, pdfText(7.8f, pdfMuted))
        drawPdfRightText(canvas, value, right, baseline, width * 0.4f, pdfText(7.8f, pdfInk, bold = true))
        canvas.drawLine(left, baseline + 5f, right, baseline + 5f, pdfStroke(pdfLine, 0.35f))
    }

    private fun drawCuadreMovementHeader(canvas: Canvas, left: Float, y: Float, right: Float): Float {
        canvas.drawRoundRect(RectF(left, y, right, y + 21f), 4f, 4f, pdfFill(pdfLight))
        val paint = pdfText(6.8f, pdfInk, bold = true)
        drawPdfTextFit(canvas, "PRODUCTO", left + 6f, y + 14f, 204f, paint)
        drawPdfTextFit(canvas, "TIPO", left + 216f, y + 14f, 64f, paint)
        drawPdfRightText(canvas, "CANT.", left + 340f, y + 14f, 55f, paint)
        drawPdfTextFit(canvas, "CENTRO", left + 346f, y + 14f, 64f, paint)
        drawPdfRightText(canvas, "IMPORTE", right - 5f, y + 14f, 98f, paint)
        return y + 24f
    }

    fun uriFor(file: File): Uri =
        FileProvider.getUriForFile(context, context.packageName + ".files", file)

    private fun write(name: String, bytes: ByteArray): File {
        val file = File(dir(), name)
        file.writeBytes(bytes)
        return file
    }

    private fun csv(v: Any): String {
        val s = v.toString()
        return if (s.contains(',') || s.contains('"') || s.contains('\n')) "\"${s.replace("\"", "\"\"")}\"" else s
    }

    private fun ts() = System.currentTimeMillis().toString()

    /** Minimal XLSX (Office Open XML) without Apache POI. */
    private fun writeXlsx(name: String, sheet: String, headers: List<String>, rows: List<List<Any>>): File {
        val file = File(dir(), name)
        ZipOutputStream(FileOutputStream(file)).use { zip ->
            fun put(path: String, content: String) {
                zip.putNextEntry(ZipEntry(path))
                zip.write(content.toByteArray(Charsets.UTF_8))
                zip.closeEntry()
            }
            put("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
            put("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
            put("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""")
            put("xl/workbook.xml", """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xml(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>""")
            val sb = StringBuilder("""<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>""")
            fun rowXml(idx: Int, cols: List<Any>) {
                sb.append("<row r=\"$idx\">")
                cols.forEachIndexed { i, v ->
                    val col = ('A'.code + i).toChar()
                    val num = v is Number
                    if (num) sb.append("<c r=\"$col$idx\"><v>${v}</v></c>")
                    else sb.append("<c r=\"$col$idx\" t=\"inlineStr\"><is><t>${xml(v.toString())}</t></is></c>")
                }
                sb.append("</row>")
            }
            rowXml(1, headers)
            rows.forEachIndexed { i, r -> rowXml(i + 2, r) }
            sb.append("</sheetData></worksheet>")
            put("xl/worksheets/sheet1.xml", sb.toString())
        }
        return file
    }

    private fun xml(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
}
