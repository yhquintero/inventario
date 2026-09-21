package com.cuadrepinar.inventario.ui.finance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.repository.CuadreRepository
import com.cuadrepinar.inventario.data.repository.ExchangeRepository
import com.cuadrepinar.inventario.data.repository.MovementRepository
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.domain.usecase.CuadreCalculator
import com.cuadrepinar.inventario.ui.components.KpiCard
import com.cuadrepinar.inventario.ui.components.SectionTitle
import com.cuadrepinar.inventario.util.Dates
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FinanceViewModel @Inject constructor(
    movements: MovementRepository,
    cuadre: CuadreRepository,
    val exchange: ExchangeRepository
) : ViewModel() {
    val movs = movements.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val rates = exchange.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val cuadres = cuadre.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun addRate(pair: String, rate: Double, actor: UserAccount) {
        viewModelScope.launch { exchange.add(pair, rate, actor) }
    }
}

@Composable
fun FinanceScreen(user: UserAccount, vm: FinanceViewModel = hiltViewModel()) {
    val movs by vm.movs.collectAsState()
    val rates by vm.rates.collectAsState()
    val cuadres by vm.cuadres.collectAsState()
    val ventas = movs.filter { it.type == MovementType.VENTA }
    val comisiones = movs.filter { it.center == SaleCenter.GESTOR }.sumOf { it.comisionCup }
    val canEdit = RolePermissions.can(user.role, Permission.EXCHANGE_EDIT)
    var pair by remember { mutableStateOf("CUP/USD") }
    var rate by remember { mutableStateOf("") }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text("Finanzas", style = MaterialTheme.typography.headlineMedium) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Ventas USD", Money.usd(ventas.sumOf { it.importeUsd }), modifier = Modifier.weight(1f))
                KpiCard("Comisiones", Money.cup(comisiones), "GESTOR", Modifier.weight(1f))
            }
        }
        item {
            val tot = cuadres.fold(0.0) { acc, c -> acc + CuadreCalculator.totals(c, movs.filter { it.dateEpoch == c.dateEpoch }).extraccionTotalUsd }
            val ent = cuadres.fold(0.0) { acc, c -> acc + CuadreCalculator.totals(c, movs.filter { it.dateEpoch == c.dateEpoch }).entradaDineroUsd }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Entradas dinero", Money.usd(ent), modifier = Modifier.weight(1f))
                KpiCard("Extracciones", Money.usd(tot), modifier = Modifier.weight(1f))
            }
        }
        item { SectionTitle("Historial de tipo de cambio") }
        if (canEdit) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(pair, { pair = it }, label = { Text("Par") }, modifier = Modifier.weight(1f))
                    OutlinedTextField(rate, { rate = it }, label = { Text("Tasa") }, modifier = Modifier.weight(1f))
                }
                Button(onClick = { vm.addRate(pair, rate.toDoubleOrNull() ?: 0.0, user); rate = "" }, modifier = Modifier.padding(top = 8.dp)) {
                    Text("Registrar cambio")
                }
            }
        }
        items(rates, key = { it.id }) { r ->
            Column(Modifier.padding(vertical = 4.dp)) {
                Text("${r.pair}  =  ${r.rate}", style = MaterialTheme.typography.titleMedium)
                Text("${Dates.format(r.dateEpoch)}  ${r.note}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
