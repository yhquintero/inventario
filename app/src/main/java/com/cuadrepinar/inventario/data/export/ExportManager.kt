package com.cuadrepinar.inventario.data.export

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
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
        val sb = StringBuilder("PRODUCTOS,STOCK INICIAL,STOCK ACTUAL,PRECIO VENTA (USD),COMISION (CUP),CATEGORIA\n")
        products.forEach {
            sb.append(listOf(it.name, it.stockInicial, it.stockActual, it.precioVentaUsd, it.comisionCup, it.category).joinToString(",") { v -> csv(v) }).append('\n')
        }
        return write("inventario_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun csvMovements(movs: List<Movement>): File {
        val sb = StringBuilder("FECHA,PRODUCTO,MOVIMIENTO,CANTIDAD,PRECIO VENTA USD,IMPORTE,TIPO,COMISION CUP,STOCK INICIAL,STOCK FINAL,USUARIO\n")
        movs.forEach {
            sb.append(
                listOf(
                    Dates.format(it.dateEpoch), it.productName, it.type.name, it.quantity, it.unitPriceUsd,
                    it.importeUsd, it.center.name, it.comisionCup, it.stockInicial, it.stockFinal, it.userName
                ).joinToString(",") { v -> csv(v) }
            ).append('\n')
        }
        return write("movimientos_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun csvComprobacion(rows: List<ComprobacionRow>): File {
        val sb = StringBuilder("PRODUCTOS,STOCK INICIAL,VENTAS,ENTRADAS,SALIDAS,STOCK CALCULADO,STOCK FINAL,PRECIO VENTA,IMPORTE PRECIO ORIGINAL,IMPORTE REAL,DIFERENCIA DE IMPORTE\n")
        rows.forEach {
            sb.append(
                listOf(
                    it.product, it.stockInicial, it.ventas, it.entradas, it.salidas, it.stockCalculado,
                    it.stockFinal, it.precioVenta, it.importeOriginal, it.importeReal, it.diferenciaImporte
                ).joinToString(",") { v -> csv(v) }
            ).append('\n')
        }
        return write("comprobacion_${ts()}.csv", sb.toString().toByteArray(Charsets.UTF_8))
    }

    fun xlsxComprobacion(rows: List<ComprobacionRow>): File {
        val headers = listOf(
            "PRODUCTOS", "STOCK INICIAL", "VENTAS", "ENTRADAS", "SALIDAS", "STOCK CALCULADO",
            "STOCK FINAL", "PRECIO VENTA", "IMPORTE PRECIO ORIGINAL", "IMPORTE REAL", "DIFERENCIA DE IMPORTE"
        )
        val data = rows.map {
            listOf(
                it.product, it.stockInicial, it.ventas, it.entradas, it.salidas, it.stockCalculado,
                it.stockFinal, it.precioVenta, it.importeOriginal, it.importeReal, it.diferenciaImporte
            )
        }
        return writeXlsx("comprobacion_${ts()}.xlsx", "COMPROBACION", headers, data)
    }

    fun pdfCuadre(cuadre: DailyCuadre, totals: CuadreTotals, movs: List<Movement>): File {
        val doc = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = doc.startPage(pageInfo)
        val c = page.canvas
        val title = Paint().apply { color = Color.rgb(15, 110, 102); textSize = 18f; isFakeBoldText = true }
        val body = Paint().apply { color = Color.rgb(28, 25, 23); textSize = 10f }
        var y = 40f
        c.drawText("Cuadre Pinar — ${cuadre.weekday.replaceFirstChar { it.uppercase() }} ${Dates.format(cuadre.dateEpoch)}", 40f, y, title)
        y += 24
        fun line(t: String) {
            c.drawText(t, 40f, y, body); y += 14
        }
        line("CUP/USD ${cuadre.cupUsd}    MXN/USD ${cuadre.mxnUsd}")
        line("VENTA TOTAL  ${Money.usd(totals.ventaTotal)}")
        line("COBROS USD   ${Money.usd(totals.cobrosUsd)}")
        line("ENTRADA DINERO ${Money.usd(totals.entradaDineroUsd)}")
        line("EXTRACCIÓN   ${Money.usd(totals.extraccionTotalUsd)}")
        line("TOTAL GENERAL ${Money.usd(totals.totalGeneral)}")
        line("DIFERENCIA   ${Money.usd(totals.diferenciaUsd)}  (${Money.cup(totals.diferenciaMn)})")
        line("FONDO FINAL  ${Money.cup(totals.fondoFinalCup)}  /  ${Money.usd(totals.fondoFinalUsd)}")
        y += 10
        line("Movimientos (${movs.size})")
        movs.take(28).forEach {
            line("${it.type.name}  ${it.productName.take(28)}  x${Money.qty(it.quantity)}  ${Money.usd(it.importeUsd)}  ${it.center.name}")
        }
        doc.finishPage(page)
        val file = File(dir(), "cuadre_${ts()}.pdf")
        FileOutputStream(file).use { doc.writeTo(it) }
        doc.close()
        return file
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
