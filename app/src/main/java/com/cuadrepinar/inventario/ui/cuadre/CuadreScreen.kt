package com.cuadrepinar.inventario.ui.cuadre

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.cuadrepinar.inventario.data.repository.MovementRepository
import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.RolePermissions
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
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class CuadreViewModel @Inject constructor(
    private val repo: CuadreRepository,
    movements: MovementRepository,
    val sync: com.cuadrepinar.inventario.data.sync.SyncManager
) : ViewModel() {
    var date by mutableStateOf(LocalDate.now())

    fun closeDay() = viewModelScope.launch {
        val r = sync.closeDay(date.toString())
        info = if (r.ok) "🔒 Día ${Dates.format(Dates.startOfDay(date))} cerrado" else r.error
        load(date)
    }

    fun reopenDay(reason: String) = viewModelScope.launch {
        val r = sync.reopenDay(date.toString(), reason)
        info = if (r.ok) "Día reabierto" else r.error
        load(date)
    }
    val movements = movements.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    var cuadre by mutableStateOf<DailyCuadre?>(null)
    var info by mutableStateOf<String?>(null)

    fun load(d: LocalDate = date) {
        date = d
        viewModelScope.launch { cuadre = repo.forDate(d) }
    }

    fun save(c: DailyCuadre, actor: UserAccount) {
        viewModelScope.launch {
            repo.save(c, actor)
            info = "Cuadre guardado. Tipo de cambio registrado en el historial."
            cuadre = c
        }
    }
}

@Composable
fun CuadreScreen(user: UserAccount, vm: CuadreViewModel = hiltViewModel()) {
    val movs by vm.movements.collectAsState()
    LaunchedEffect(Unit) { vm.load() }
    val c = vm.cuadre ?: return
    val dayMovs = movs.filter { it.dateEpoch == c.dateEpoch }
    val totals = CuadreCalculator.totals(c, dayMovs)
    val sync by vm.sync.status.collectAsState()
    val closed = c.closed || vm.date.toString() in sync.closedDays
    val canEdit = RolePermissions.can(user.role, Permission.CUADRE_EDIT) && !closed
    var form by remember(c) { mutableStateOf(c) }
    var reopenReason by remember { mutableStateOf<String?>(null) }

    fun n(v: Double) = if (v == 0.0) "" else v.toString()
    fun p(s: String) = s.replace(",", ".").toDoubleOrNull() ?: 0.0

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Cuadre del ${form.weekday}", style = MaterialTheme.typography.headlineMedium)
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            androidx.compose.material3.TextButton(onClick = { vm.load(vm.date.minusDays(1)) }) { Text("‹") }
            Text(Dates.formatLong(form.dateEpoch), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            androidx.compose.material3.TextButton(onClick = { vm.load(vm.date.plusDays(1)) }, enabled = vm.date < LocalDate.now()) { Text("›") }
        }
        if (closed) {
            androidx.compose.material3.Card(Modifier.fillMaxWidth(), colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                Text("🔒 Día cerrado: movimientos y cuadre son de solo lectura. Solo un administrador puede reabrirlo.", Modifier.padding(12.dp))
            }
        }
        if (sync.connected) {
            val canClose = user.role.name in setOf("ADMINISTRADOR", "JEFE", "ECONOMICO")
            if (!closed && canClose) androidx.compose.material3.OutlinedButton(onClick = { vm.closeDay() }, modifier = Modifier.fillMaxWidth()) { Text("🔒 Cerrar día") }
            if (closed && user.role.name == "ADMINISTRADOR") androidx.compose.material3.OutlinedButton(onClick = { reopenReason = "" }, modifier = Modifier.fillMaxWidth()) { Text("🔓 Reabrir día") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            KpiCard("VENTA TOTAL", Money.usd(totals.ventaTotal), modifier = Modifier.weight(1f))
            KpiCard("TOTAL GENERAL", Money.usd(totals.totalGeneral), modifier = Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            KpiCard("Diferencia USD", Money.usd(totals.diferenciaUsd), Money.cup(totals.diferenciaMn), Modifier.weight(1f))
            KpiCard("Fondo final", Money.cup(totals.fondoFinalCup), Money.usd(totals.fondoFinalUsd), Modifier.weight(1f))
        }

        SectionTitle("Tipo de cambio")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(n(form.cupUsd), { form = form.copy(cupUsd = p(it)) }, label = { Text("CUP/USD") }, modifier = Modifier.weight(1f))
            OutlinedTextField(n(form.mxnUsd), { form = form.copy(mxnUsd = p(it)) }, label = { Text("MXN/USD") }, modifier = Modifier.weight(1f))
        }

        SectionTitle("Cobros (desglose de la venta)")
        OutlinedTextField(n(form.cobroUsd), { form = form.copy(cobroUsd = p(it)) }, label = { Text("USD") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cobroZelle), { form = form.copy(cobroZelle = p(it)) }, label = { Text("ZELLE") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cobroMxn), { form = form.copy(cobroMxn = p(it)) }, label = { Text("MXN") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cobroCupEfectivo), { form = form.copy(cobroCupEfectivo = p(it)) }, label = { Text("CUP EFECTIVO") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cobroCupTransf), { form = form.copy(cobroCupTransf = p(it)) }, label = { Text("CUP TRANSF") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cobroEuropa), { form = form.copy(cobroEuropa = p(it)) }, label = { Text("EUROPA") }, modifier = Modifier.fillMaxWidth())
        Text("Cobros en USD: ${Money.usd(totals.cobrosUsd)}")

        SectionTitle("Entrada de dinero / Extracción")
        OutlinedTextField(n(form.entradaUsd), { form = form.copy(entradaUsd = p(it)) }, label = { Text("Entrada USD") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.entradaCup), { form = form.copy(entradaCup = p(it)) }, label = { Text("Entrada CUP") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.extraccionUsd), { form = form.copy(extraccionUsd = p(it)) }, label = { Text("Extracción USD") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.extraccionCup), { form = form.copy(extraccionCup = p(it)) }, label = { Text("Extracción CUP") }, modifier = Modifier.fillMaxWidth())

        SectionTitle("Fondo de caja")
        OutlinedTextField(n(form.fondoInicialCup), { form = form.copy(fondoInicialCup = p(it)) }, label = { Text("Fondo inicial CUP") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.fondoInicialUsd), { form = form.copy(fondoInicialUsd = p(it)) }, label = { Text("Fondo inicial USD") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.cambioCup), { form = form.copy(cambioCup = p(it)) }, label = { Text("Cambio CUP") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.domicilioCup), { form = form.copy(domicilioCup = p(it)) }, label = { Text("Domicilio CUP") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.otrosGastosCup), { form = form.copy(otrosGastosCup = p(it)) }, label = { Text("Otros gastos CUP") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(form.otrosGastosObs, { form = form.copy(otrosGastosObs = it) }, label = { Text("Observación gastos") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(n(form.comisionesCup), { form = form.copy(comisionesCup = p(it)) }, label = { Text("Comisiones CUP") }, modifier = Modifier.fillMaxWidth())
        Text("Comisiones según movimientos GESTOR: ${Money.cup(totals.comisionesMovimientos)}")

        if (canEdit) {
            Button(onClick = { vm.save(form, user) }, modifier = Modifier.fillMaxWidth()) { Text("Guardar cuadre") }
        }
        vm.info?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
    }
    reopenReason?.let { reason ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { reopenReason = null },
            title = { Text("Reabrir día") },
            text = { OutlinedTextField(reason, { reopenReason = it }, label = { Text("Motivo (queda en la auditoría)") }) },
            confirmButton = { androidx.compose.material3.TextButton(onClick = { vm.reopenDay(reason); reopenReason = null }, enabled = reason.trim().length >= 5) { Text("Reabrir") } },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { reopenReason = null }) { Text("Cancelar") } }
        )
    }
}
