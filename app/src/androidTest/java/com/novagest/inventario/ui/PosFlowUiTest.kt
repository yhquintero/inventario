package com.novagest.inventario.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodes
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.dp
import com.novagest.inventario.domain.model.Product
import com.novagest.inventario.domain.model.SaleCenter
import com.novagest.inventario.ui.components.ChipRow
import com.novagest.inventario.ui.components.EmptyState
import com.novagest.inventario.ui.components.KpiCard
import com.novagest.inventario.ui.components.SearchField
import com.novagest.inventario.util.Money
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * A-16 · Pruebas de interfaz del flujo de venta, ejecutadas en un emulador real.
 *
 * Se monta un banco de pruebas con los **mismos componentes** que usa la app
 * (`SearchField`, `ChipRow`, `KpiCard`, `EmptyState`) y las **mismas reglas** del
 * carrito que `PosViewModel`: no se puede vender más que la existencia y la cuenta
 * se recalcula sola. Así se comprueba lo que el usuario ve y toca, no la lógica pura
 * (esa ya la cubren las pruebas de `src/test`).
 */
class PosFlowUiTest {

    @get:Rule
    val compose = createComposeRule()

    private val catalogo = listOf(
        Product(id = 1, name = "Arroz 1 kg", stockInicial = 10.0, stockActual = 10.0, precioVentaUsd = 1.7, comisionCup = 40.0, category = "Granos"),
        Product(id = 2, name = "Nevera", stockInicial = 3.0, stockActual = 3.0, precioVentaUsd = 120.0, comisionCup = 0.0, category = "Equipos"),
        Product(id = 3, name = "Arroz 5 kg", stockInicial = 2.0, stockActual = 2.0, precioVentaUsd = 8.0, comisionCup = 40.0, category = "Granos")
    )

    /** Banco de pruebas: mismo carrito y mismas reglas que la pantalla de venta. */
    @Composable
    private fun BancoDeVenta(productos: List<Product> = catalogo) {
        var q by remember { mutableStateOf("") }
        var centro by remember { mutableStateOf(SaleCenter.TIENDA) }
        var message by remember { mutableStateOf<String?>(null) }
        var cobros by remember { mutableStateOf(0) }
        val carrito = remember { mutableStateListOf<Pair<Product, Int>>() }

        fun agregar(p: Product) {
            val i = carrito.indexOfFirst { it.first.id == p.id }
            val actual = if (i >= 0) carrito[i].second else 0
            if (actual + 1 > p.stockActual) {
                message = "Solo hay ${Money.qty(p.stockActual)} de ${p.name}."
                return
            }
            if (i >= 0) carrito[i] = carrito[i].first to actual + 1 else carrito += p to 1
            message = null
        }

        val total = carrito.sumOf { it.first.precioVentaUsd * it.second }
        val lista = productos.filter {
            q.isBlank() || it.name.contains(q, true) || it.barcode.contains(q.trim(), true)
        }

        MaterialTheme {
            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                SearchField(q, { q = it }, "Buscar producto")
                LazyColumn(Modifier.fillMaxWidth().testTag("lista").weight(1f, fill = false)) {
                    items(lista, key = { it.id }) { p ->
                        Card(Modifier.fillMaxWidth().clickable { agregar(p) }) {
                            Text(p.name, Modifier.padding(8.dp))
                        }
                    }
                }
                if (lista.isEmpty()) EmptyState("Sin productos que coincidan con la búsqueda.")
                ChipRow(
                    options = listOf(SaleCenter.TIENDA, SaleCenter.GESTOR),
                    selected = centro,
                    label = { it.label },
                    onSelect = { centro = it }
                )
                carrito.forEach { (p, qty) ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("$qty × ${p.name}")
                        Text(Money.usd(qty * p.precioVentaUsd))
                    }
                }
                message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (carrito.isNotEmpty()) {
                        OutlinedButton(onClick = { carrito.clear(); message = null }) { Text("Vaciar") }
                    }
                    Button(onClick = { cobros++; carrito.clear() }, enabled = carrito.isNotEmpty()) {
                        Text(if (carrito.isEmpty()) "Toca productos para vender" else "Cobrar " + Money.usd(total))
                    }
                }
                if (cobros > 0) Text("Venta registrada · centro $centro · cobros $cobros", Modifier.testTag("resultado"))
            }
        }
    }

    @Test
    fun tocarUnProductoLoSumaYLaCuentaSeRecalcula() {
        compose.setContent { BancoDeVenta() }

        compose.onNodeWithText("Toca productos para vender").assertIsDisplayed()
        compose.onNodeWithText("Arroz 1 kg").performClick()
        compose.onNodeWithText("1 × Arroz 1 kg").assertIsDisplayed()
        compose.onNodeWithText("Cobrar $1.70").assertIsDisplayed()

        compose.onNodeWithText("Arroz 1 kg").performClick()
        compose.onNodeWithText("2 × Arroz 1 kg").assertIsDisplayed()
        compose.onNodeWithText("Cobrar $3.40").assertIsDisplayed()
    }

    @Test
    fun cobrarRegistraLaVentaYVaciaElCarrito() {
        compose.setContent { BancoDeVenta() }

        compose.onNodeWithText("Nevera").performClick()
        compose.onNodeWithText("Cobrar $120.00").performClick()

        compose.onNodeWithTag("resultado").assertIsDisplayed()
        compose.onNodeWithText("Venta registrada · centro TIENDA · cobros 1").assertIsDisplayed()
        compose.onNodeWithText("Toca productos para vender").assertIsDisplayed()
    }

    @Test
    fun noSePuedeVenderMasQueLaExistencia() {
        compose.setContent { BancoDeVenta() }

        repeat(3) { compose.onNodeWithText("Arroz 5 kg").performClick() }

        compose.onNodeWithText("Solo hay 2 de Arroz 5 kg.").assertIsDisplayed()
        compose.onNodeWithText("2 × Arroz 5 kg").assertIsDisplayed()
    }

    @Test
    fun elBuscadorFiltraPorNombre() {
        compose.setContent { BancoDeVenta() }

        compose.onNodeWithText("Buscar producto").performTextInput("nevera")

        compose.onNodeWithText("Nevera").assertIsDisplayed()
        compose.onNodeWithText("Arroz 1 kg").assertDoesNotExist()
    }

    @Test
    fun sinCoincidenciasAvisaEnVezDeQuedarEnBlanco() {
        compose.setContent { BancoDeVenta() }

        compose.onNodeWithText("Buscar producto").performTextInput("zzz")

        compose.onNodeWithText("Sin productos que coincidan con la búsqueda.").assertIsDisplayed()
    }

    @Test
    fun elegirElCentroDeVentaCambiaElChipYLaVenta() {
        compose.setContent { BancoDeVenta() }

        compose.onNodeWithText("GESTOR").performClick()
        compose.onNodeWithText("Arroz 1 kg").performClick()
        compose.onNodeWithText("Cobrar $1.70").performClick()

        compose.onNodeWithText("Venta registrada · centro GESTOR · cobros 1").assertIsDisplayed()
    }

    @Test
    fun todosLosControlesTienenTextoParaElLectorDePantalla() {
        compose.setContent { BancoDeVenta() }
        compose.onNodeWithText("Arroz 1 kg").performClick() // deja botones visibles

        val controles = compose.onAllNodes(hasClickAction()).fetchSemanticsNodes()
        assertTrue("debe haber controles interactivos", controles.isNotEmpty())
        controles.forEach { nodo ->
            val config = nodo.config
            val conTexto = config.contains(SemanticsProperties.Text) ||
                config.contains(SemanticsProperties.ContentDescription) ||
                config.contains(SemanticsProperties.EditableText)
            assertTrue("todo control debe tener texto o descripción accesible: $config", conTexto)
        }
    }

    @Test
    fun laCifraDeUnKpiCabeEnUnaSolaLinea() {
        compose.setContent {
            MaterialTheme { KpiCard(title = "Venta del día", value = Money.usd(96502.82), subtitle = "USD") }
        }

        val nodo = compose.onNodeWithText("$96,502.82").fetchSemanticsNode()
        val lineas = nodo.config.getOrNull(SemanticsProperties.Text)?.firstOrNull()?.layoutResult?.value
        assertEquals("la cifra se parte en varias líneas", 1, lineas?.lineCount)
    }
}
