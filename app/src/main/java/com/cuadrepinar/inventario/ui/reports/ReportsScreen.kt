package com.cuadrepinar.inventario.ui.reports

import android.app.DatePickerDialog
import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.export.ExportManager
import com.cuadrepinar.inventario.data.repository.ProductRepository
import com.cuadrepinar.inventario.data.repository.ReportRepository
import com.cuadrepinar.inventario.domain.model.ComprobacionRow
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.ui.components.KpiCard
import com.cuadrepinar.inventario.ui.components.SectionTitle
import com.cuadrepinar.inventario.util.Dates
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val reports: ReportRepository,
    val exporter: ExportManager
) : ViewModel() {
    var rows by mutableStateOf<List<ComprobacionRow>>(emptyList())
    var movs by mutableStateOf<List<Movement>>(emptyList())
    var period by mutableStateOf("semanal")
    var anchorDate by mutableStateOf(LocalDate.now())
    var fromDate by mutableStateOf(LocalDate.now().minusDays(30))
    var toDate by mutableStateOf(LocalDate.now())
    var validRange by mutableStateOf(true)

    fun range(): Pair<LocalDate, LocalDate> = when (period) {
        "período" -> fromDate to toDate
        else -> {
            val (from, to) = Dates.periodRange(period, anchorDate)
            Dates.toLocalDate(from) to Dates.toLocalDate(to)
        }
    }

    fun load(period: String, date: LocalDate = anchorDate) {
        this.period = period
        if (period != "período") anchorDate = date
        val (from, to) = range()
        validRange = !from.isAfter(to)
        if (!validRange) { rows = emptyList(); movs = emptyList(); return }
        viewModelScope.launch {
            val fromEpoch = Dates.startOfDay(from)
            val toEpoch = Dates.endOfDay(to)
            rows = reports.comprobacion(fromEpoch, toEpoch)
            movs = reports.filtered(com.cuadrepinar.inventario.domain.model.ReportFilter(fromEpoch, toEpoch))
        }
    }

    fun setCustomFrom(date: LocalDate) { fromDate = date; load("período") }
    fun setCustomTo(date: LocalDate) { toDate = date; load("período") }
}

@Composable
fun ReportsScreen(user: UserAccount, vm: ReportsViewModel = hiltViewModel()) {
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.load("semanal") }
    val canExport = RolePermissions.can(user.role, Permission.REPORTS_EXPORT)
    val ventas = vm.movs.filter { it.type == MovementType.VENTA }
    val entradas = vm.movs.filter { it.type == MovementType.ENTRADA }
    val salidas = vm.movs.filter { it.type == MovementType.SALIDA }
    val range = vm.range()

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Reportes e informes", style = MaterialTheme.typography.headlineMedium)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()).padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("diario", "semanal", "mensual", "anual", "período").forEach { period ->
                    FilterChip(
                        selected = vm.period == period,
                        onClick = { vm.load(period) },
                        label = { Text(period.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }
        }
        item {
            if (vm.period == "período") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            DatePickerDialog(context, { _, year, month, day -> vm.setCustomFrom(LocalDate.of(year, month + 1, day)) },
                                vm.fromDate.year, vm.fromDate.monthValue - 1, vm.fromDate.dayOfMonth).show()
                        }, modifier = Modifier.weight(1f)
                    ) { Text("Desde ${Dates.format(Dates.startOfDay(vm.fromDate))}") }
                    OutlinedButton(
                        onClick = {
                            DatePickerDialog(context, { _, year, month, day -> vm.setCustomTo(LocalDate.of(year, month + 1, day)) },
                                vm.toDate.year, vm.toDate.monthValue - 1, vm.toDate.dayOfMonth).show()
                        }, modifier = Modifier.weight(1f)
                    ) { Text("Hasta ${Dates.format(Dates.startOfDay(vm.toDate))}") }
                }
            } else {
                OutlinedButton(onClick = {
                    DatePickerDialog(context, { _, year, month, day ->
                        vm.load(vm.period, LocalDate.of(year, month + 1, day))
                    }, vm.anchorDate.year, vm.anchorDate.monthValue - 1, vm.anchorDate.dayOfMonth).show()
                }) { Text("Fecha de referencia: ${Dates.format(Dates.startOfDay(vm.anchorDate))}") }
            }
            val label = "${Dates.format(Dates.startOfDay(range.first))} – ${Dates.format(Dates.startOfDay(range.second))}"
            Text(if (vm.validRange) "Período $label" else "Revisa el rango: la fecha inicial es posterior a la final.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Ventas", Money.usd(ventas.sumOf { it.importeUsd }), "${Money.qty(ventas.sumOf { it.quantity })} uds.", Modifier.weight(1f))
                KpiCard("Utilidad bruta", Money.usd(vm.rows.sumOf { it.utilidadBruta }), "costo histórico ${Money.usd(vm.rows.sumOf { it.costoVentas })}", Modifier.weight(1f))
                KpiCard("Entradas / salidas", "${Money.qty(entradas.sumOf { it.quantity })} / ${Money.qty(salidas.sumOf { it.quantity })}", "unidades", Modifier.weight(1f))
            }
        }
        item {
            SectionTitle("Ventas por centro")
            val gestor = ventas.filter { it.center == SaleCenter.GESTOR }.sumOf { it.importeUsd }
            val tienda = ventas.filter { it.center == SaleCenter.TIENDA }.sumOf { it.importeUsd }
            SimpleBarChart(listOf("GESTOR" to gestor.toFloat(), "TIENDA" to tienda.toFloat()))
        }
        item {
            SectionTitle("Composición de movimientos")
            SimpleBarChart(
                listOf(
                    "VENTA" to ventas.sumOf { it.quantity }.toFloat(),
                    "ENTRADA" to entradas.sumOf { it.quantity }.toFloat(),
                    "SALIDA" to salidas.sumOf { it.quantity }.toFloat()
                )
            )
        }
        item { SectionTitle("COMPROBACION · ${vm.period.replaceFirstChar { it.uppercase() }}") }
        if (canExport) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = {
                        val f = vm.exporter.csvComprobacion(vm.rows)
                        share(context, vm.exporter.uriFor(f), "text/csv")
                    }) { Text("CSV") }
                    OutlinedButton(onClick = {
                        val f = vm.exporter.xlsxComprobacion(vm.rows)
                        share(context, vm.exporter.uriFor(f), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    }) { Text("Excel") }
                    Button(onClick = {
                        val f = vm.exporter.csvMovements(vm.movs)
                        share(context, vm.exporter.uriFor(f), "text/csv")
                    }) { Text("Movimientos CSV") }
                }
            }
            item {
                OutlinedButton(
                    onClick = {
                        val (from, to) = vm.range()
                        val file = vm.exporter.pdfComprobacion(vm.rows, vm.period, Dates.startOfDay(from), Dates.endOfDay(to))
                        share(context, vm.exporter.uriFor(file), "application/pdf")
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("📄 Exportar comprobación PDF") }
            }
        }
        items(vm.rows.filter { it.ventas != 0.0 || it.entradas != 0.0 || it.salidas != 0.0 || it.stockInicial != 0.0 || it.stockFinal != 0.0 }, key = { it.productId }) { row ->
            Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(row.product, style = MaterialTheme.typography.titleMedium)
                Text(
                    "Ini ${Money.qty(row.stockInicial)}  V ${Money.qty(row.ventas)}  E ${Money.qty(row.entradas)}  S ${Money.qty(row.salidas)}  Cierre ${Money.qty(row.stockFinal)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text("Lista ${Money.usd(row.importeOriginal)}  venta ${Money.usd(row.importeReal)}  costo ${Money.usd(row.costoVentas)}  utilidad ${Money.usd(row.utilidadBruta)}")
                if (row.comisionesCup != 0.0) Text("Comisiones históricas ${Money.cup(row.comisionesCup)}")
            }
        }
    }
}

@Composable
fun SimpleBarChart(values: List<Pair<String, Float>>, modifier: Modifier = Modifier) {
    val max = values.maxOfOrNull { it.second }?.takeIf { it > 0 } ?: 1f
    val colors = listOf(Color(0xFF0F6E66), Color(0xFFC4A35A), Color(0xFF7C4A1E), Color(0xFF3B6B9A))
    Column(modifier.fillMaxWidth()) {
        Canvas(Modifier.fillMaxWidth().height(140.dp)) {
            val barW = size.width / (values.size * 1.8f)
            values.forEachIndexed { i, (_, v) ->
                val h = (v / max) * size.height * 0.85f
                val x = i * (size.width / values.size) + barW / 2
                drawRect(colors[i % colors.size], topLeft = Offset(x, size.height - h), size = Size(barW, h))
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            values.forEach { Text(it.first, style = MaterialTheme.typography.labelLarge) }
        }
    }
}

private fun share(context: android.content.Context, uri: android.net.Uri, mime: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = mime
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Exportar"))
}
