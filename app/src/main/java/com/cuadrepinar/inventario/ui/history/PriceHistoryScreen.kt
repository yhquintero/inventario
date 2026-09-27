package com.cuadrepinar.inventario.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.cuadrepinar.inventario.data.sync.SyncManager
import com.cuadrepinar.inventario.ui.components.SearchField
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PriceHistoryViewModel @Inject constructor(val sync: SyncManager) : ViewModel()

private val LABEL = mapOf("precioVentaUsd" to "Precio venta", "precioVenta2Usd" to "Precio venta 2", "precioCostoUsd" to "Precio costo", "comisionCup" to "Comisión")

/** Historial diario de cambios de precio y comisión (compartido con la Web). */
@Composable
fun PriceHistoryScreen(vm: PriceHistoryViewModel = hiltViewModel()) {
    val status by vm.sync.status.collectAsState()
    val all = remember(status.version) { vm.sync.priceHistory() }
    var q by remember { mutableStateOf("") }
    val list = all.filter { q.isBlank() || it.product.contains(q, true) || it.date.contains(q) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Historial de precios", style = MaterialTheme.typography.headlineMedium)
        if (!status.connected && all.isEmpty()) {
            Text("El historial se guarda en el servidor. Entra con la dirección del servidor para verlo aquí.")
            return@Column
        }
        SearchField(q, { q = it }, "Buscar producto o fecha (2026-09-25)")
        Text("${list.size} cambios", color = MaterialTheme.colorScheme.onSurfaceVariant)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(list) { h ->
                val money = { v: Double -> if (h.field == "comisionCup") Money.cup(v) else Money.usd(v) }
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(h.product, style = MaterialTheme.typography.titleSmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${h.date} · ${LABEL[h.field] ?: h.field}:", style = MaterialTheme.typography.bodySmall)
                            Text("${money(h.old)} → ${money(h.new)}", style = MaterialTheme.typography.bodySmall,
                                color = if (h.new > h.old) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                        }
                        if (h.user.isNotBlank()) Text(h.user, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
