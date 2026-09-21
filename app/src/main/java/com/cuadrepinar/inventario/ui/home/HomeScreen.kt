package com.cuadrepinar.inventario.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.repository.CuadreRepository
import com.cuadrepinar.inventario.data.repository.MovementRepository
import com.cuadrepinar.inventario.data.repository.ProductRepository
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.domain.usecase.CuadreCalculator
import com.cuadrepinar.inventario.ui.components.KpiCard
import com.cuadrepinar.inventario.ui.components.SectionTitle
import com.cuadrepinar.inventario.util.Dates
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    products: ProductRepository,
    movements: MovementRepository,
    private val cuadreRepo: CuadreRepository
) : ViewModel() {
    val products = products.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val low = products.observeLowStock().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val movements = movements.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

@Composable
fun HomeScreen(user: UserAccount, vm: HomeViewModel = hiltViewModel()) {
    val products by vm.products.collectAsState()
    val low by vm.low.collectAsState()
    val movs by vm.movements.collectAsState()
    val today = Dates.startOfDay(LocalDate.now())
    val todayMovs = movs.filter { it.dateEpoch == today }
    val ventas = todayMovs.filter { it.type == MovementType.VENTA }.sumOf { it.importeUsd }
    val unidades = todayMovs.filter { it.type == MovementType.VENTA }.sumOf { it.quantity }
    val valorInventario = products.sumOf { it.stockActual * it.precioVentaUsd }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Buenas, ${user.displayName.split(" ").first()}", style = MaterialTheme.typography.headlineMedium)
            Text("Hoy es ${Dates.formatLong(today)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Ventas de hoy", Money.usd(ventas), "${Money.qty(unidades)} uds.", Modifier.weight(1f))
                KpiCard("Inventario", Money.usd(valorInventario), "${products.size} productos", Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Movimientos hoy", todayMovs.size.toString(), "VENTA / ENTRADA / SALIDA", Modifier.weight(1f))
                KpiCard("Stock bajo", low.size.toString(), "Requieren reposición", Modifier.weight(1f))
            }
        }
        item { SectionTitle("Alertas de stock") }
        if (low.isEmpty()) item { Text("Todo el inventario está por encima del mínimo.") }
        items(low.take(12), key = { it.id }) { p ->
            Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(p.name, style = MaterialTheme.typography.titleMedium)
                Text("Stock ${Money.qty(p.stockActual)} · mínimo ${Money.qty(p.minStock)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                val frac = if (p.minStock <= 0) 1f else (p.stockActual / (p.minStock * 3)).toFloat().coerceIn(0f, 1f)
                LinearProgressIndicator(progress = { frac }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
            }
        }
        item { SectionTitle("Últimos movimientos") }
        items(movs.take(10), key = { it.id }) { m ->
            Column(Modifier.padding(vertical = 4.dp)) {
                Text("${m.type.name} · ${m.productName}", style = MaterialTheme.typography.titleMedium)
                Text("${Money.qty(m.quantity)} · ${Money.usd(m.importeUsd)} · ${m.center.name} · ${Dates.format(m.dateEpoch)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
