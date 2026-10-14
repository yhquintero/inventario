package com.novagest.inventario.ui.ipv

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.novagest.inventario.data.sync.SyncManager
import com.novagest.inventario.domain.model.FichaCosto
import com.novagest.inventario.domain.model.IpvControl
import com.novagest.inventario.domain.model.UserAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/**
 * Fichas de Costo y Controles IPV (colecciones `fichas`/`ipvControls` del
 * estado compartido). En Android se consultan; el alta, la aprobación y la
 * validación completas viven en la Web, como en Clientes y fiados.
 * Adaptado de yhquintero/IPV_Fichas-Costos.
 */
@HiltViewModel
class IpvViewModel @Inject constructor(private val sync: SyncManager) : ViewModel() {
    var fichas by mutableStateOf<List<FichaCosto>>(emptyList())
    var controls by mutableStateOf<List<IpvControl>>(emptyList())

    init { reload() }

    fun reload() {
        fichas = sync.fichas()
        controls = sync.ipvControls()
    }
}

private fun money(v: Double, currency: String): String =
    "${String.format("%,.2f", v)} $currency"

@Composable
fun IpvScreen(user: UserAccount, vm: IpvViewModel = hiltViewModel()) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Fichas de costo · IPV", style = MaterialTheme.typography.headlineSmall)
        Text(
            "${vm.fichas.size} fichas · ${vm.controls.size} controles · la edición completa está en la Web",
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(10.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (vm.fichas.isEmpty() && vm.controls.isEmpty()) {
                item {
                    Text(
                        "Aún no hay fichas de costo. Créalas en la Web (Fichas de costo · IPV) y aparecerán aquí al sincronizar.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            items(vm.fichas, key = { "f-" + it.id }) { f ->
                Card(Modifier.padding(2.dp)) {
                    Column(Modifier.padding(12.dp)) {
                        Text("${f.productName} · v${f.version} · ${f.status}", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Rinde ${f.yieldQty} ${f.yieldUnit} · Costo ${money(f.totalCost, f.currency)} · por ración ${money(f.costPerServing, f.currency)}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        f.items.forEach { item ->
                            Text("· ${item.description}: ${item.quantity} ${item.unit} × ${money(item.unitCost, f.currency)} = ${money(item.subtotal, f.currency)}")
                        }
                    }
                }
            }
            items(vm.controls, key = { "c-" + it.id }) { c ->
                Card(Modifier.padding(2.dp)) {
                    Column(Modifier.padding(12.dp)) {
                        Text("${c.code} · ${c.productName}", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Período ${c.period} · ${c.status} · ficha ${money(c.snapshotTotal, c.currency)}" +
                                if (c.status != "Pendiente") " · comprobado ${money(c.checkedTotal, c.currency)}" else "",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
