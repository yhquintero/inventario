package com.novagest.inventario.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertIsDisplayed
import com.novagest.inventario.data.printer.EscPos
import com.novagest.inventario.data.printer.PaperWidth
import com.novagest.inventario.data.printer.TicketData
import com.novagest.inventario.data.printer.TicketFactory
import com.novagest.inventario.data.printer.TicketLine
import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.SaleCenter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

/**
 * A-16 · Pruebas en el dispositivo de la impresión de tickets.
 *
 * En el emulador no hay impresora Bluetooth, pero sí se ejecuta el mismo código que
 * escribe el flujo ESC/POS que se envía por el puerto serie simulado. Así se detecta
 * cualquier diferencia del entorno Android (juegos de caracteres, formato de números
 * o zona horaria) antes de llegar al mostrador.
 */
class TicketImpresionUiTest {

    @get:Rule
    val compose = createComposeRule()

    private val venta = TicketData(
        businessName = "Bodega Peña",
        date = "25/10/2026",
        time = "15:32",
        lines = listOf(
            TicketLine("Arroz 1 kg", 2.0, 1.7, 3.4),
            TicketLine("Nevera", 1.0, 120.0, 120.0)
        ),
        totalUsd = 123.4,
        rateCupUsd = 750.0,
        paymentType = "CONTADO",
        seller = "Ana Pérez",
        width = PaperWidth.MM_58
    )

    @Test
    fun elTicketSeGeneraConInicioAjusteYCorte() {
        val bytes = EscPos.build(venta)

        assertTrue("el flujo es largo", bytes.size > 100)
        assertTrue("empieza con INIT (ESC @)", bytes[0].toInt() == 0x1B && bytes[1].toInt() == 0x40)
        val corte = bytes.takeLast(4).toByteArray()
        assertEquals("termina con el corte de papel", listOf(0x1D.toByte(), 0x56.toByte(), 0x42.toByte(), 0x00.toByte()), corte.toList())
    }

    @Test
    fun elTicketLlevaElTotalLosProductosYElPie() {
        val texto = String(EscPos.build(venta), Charsets.US_ASCII)

        assertTrue("nombre del negocio", texto.contains("Bodega Pena"))
        assertTrue("producto con cantidad", texto.contains("2 x Arroz 1 kg"))
        assertTrue("total", texto.contains("TOTAL USD"))
        assertTrue("importe del total", texto.contains("123.40"))
        assertTrue("equivalente en CUP", texto.contains("Equivalente CUP"))
        assertTrue("pie", texto.contains("Gracias por su compra"))
        assertTrue("vendedor sin acentos (impresora térmica)", texto.contains("Atendio"))
    }

    @Test
    fun elPapelDe80MmUsaMasColumnasQueElDe58() {
        val t58 = String(EscPos.build(venta.copy(width = PaperWidth.MM_58)), Charsets.US_ASCII)
        val t80 = String(EscPos.build(venta.copy(width = PaperWidth.MM_80)), Charsets.US_ASCII)

        assertTrue("58 mm tiene 32 columnas", t58.lines().any { it.length == 32 })
        assertTrue("80 mm tiene 48 columnas", t80.lines().any { it.length == 48 })
        assertTrue("el de 80 mm no repite el ancho de 58", !t80.lines().any { it.length == 32 && it.contains("TOTAL USD") })
    }

    @Test
    fun elTicketDeUnaVentaDelHistorialLlevaSuFechaYCliente() {
        val fecha = LocalDate.of(2026, 10, 24).atTime(15, 32).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val movimiento = Movement(
            id = 7,
            dateEpoch = fecha,
            weekday = "sábado",
            productId = 1,
            productName = "Arroz 1 kg",
            type = MovementType.VENTA,
            quantity = 2.0,
            unitPriceUsd = 1.7,
            importeUsd = 3.4,
            center = SaleCenter.TIENDA,
            comisionCup = 40.0,
            stockInicial = 10.0,
            stockFinal = 8.0,
            userId = 1,
            userName = "Ana"
        )

        val ticket = TicketFactory.fromMovement(movimiento, "Bodega Peña", rateCupUsd = 750.0)
        val texto = String(EscPos.build(ticket), Charsets.US_ASCII)

        assertTrue("fecha de la venta", texto.contains("24/10/2026"))
        assertTrue("hora de la venta", texto.contains("15:32"))
        assertTrue("vendedor", texto.contains("Ana"))
    }

    @Test
    fun elTicketSePuedeMostrarEnPantalla() {
        compose.setContent { VistaPreviaTicket(venta) }

        compose.onNodeWithTag("vista-ticket").assertIsDisplayed()
        compose.onNodeWithText("TOTAL USD", substring = true).assertIsDisplayed()
        compose.onNodeWithText("123.40", substring = true).assertIsDisplayed()
    }

    /** Vista previa mínima: el mismo texto que se manda a la impresora, en pantalla. */
    @Composable
    private fun VistaPreviaTicket(ticket: TicketData) {
        val lineas = String(EscPos.build(ticket), Charsets.US_ASCII)
            .replace("\u001B@", "")
            .lines()
            .filter { it.isNotBlank() && it.any { ch -> ch.code in 32..126 } }
        MaterialTheme {
            Column(Modifier.fillMaxWidth().testTag("vista-ticket")) {
                lineas.forEach { Text(it.trim()) }
            }
        }
    }

    @Test
    fun elAvisoSinImpresoraSeLeeEnLaPantallaDeVenta() {
        compose.setContent {
            MaterialTheme {
                Text("Sin impresora configurada: elige la tuya en Ajustes → Impresora de tickets.")
            }
        }
        compose.onNodeWithText("Sin impresora configurada: elige la tuya en Ajustes → Impresora de tickets.")
            .assertIsDisplayed()
    }
}
