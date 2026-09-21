package com.cuadrepinar.inventario.ui.reports

import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
    private val products: ProductRepository,
    val exporter: ExportManager
) : ViewModel() {
    var rows by mutableStateOf<List<ComprobacionRow>>(emptyList())
    var movs by mutableStateOf<List<Movement>>(emptyList())
    var period by mutableStateOf("semanal")

    fun load(period: String) {
        this.period = period
        viewModelScope.launch {
            val (from, to) = Dates.periodRange(period)
            rows = reports.comprobacion(from, to)
            movs = reports.filtered(
                com.cuadrepinar.inventario.domain.model.ReportFilter(from, to)
            )
        }
    }
}

@Composable
fun ReportsScreen(user: UserAccount, vm: ReportsViewModel = hiltViewModel()) {
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.load("semanal") }
    val canExport = RolePermissions.can(user.role, Permission.REPORTS_EXPORT)
    val ventas = vm.movs.filter { it.type == MovementType.VENTA }
    val entradas = vm.movs.filter { it.type == MovementType.ENTRADA }
    val salidas = vm.movs.filter { it.type == MovementType.SALIDA }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Reportes e informes", style = MaterialTheme.typography.headlineMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                listOf("diario", "semanal", "mensual").forEach { p ->
                    FilterChip(selected = vm.period == p, onClick = { vm.load(p) }, label = { Text(p.replaceFirstChar { it.uppercase() }) })
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Ventas", Money.usd(ventas.sumOf { it.importeUsd }), "${Money.qty(ventas.sumOf { it.quantity })} uds.", Modifier.weight(1f))
                KpiCard("Entradas", Money.qty(entradas.sumOf { it.quantity }), "unidades", Modifier.weight(1f))
                KpiCard("Salidas", Money.qty(salidas.sumOf { it.quantity }), "unidades", Modifier.weight(1f))
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
        item { SectionTitle("COMPROBACION (espejo Excel)") }
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
        }
        items(vm.rows.filter { it.ventas != 0.0 || it.entradas != 0.0 || it.salidas != 0.0 }, key = { it.productId }) { r ->
            Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(r.product, style = MaterialTheme.typography.titleMedium)
                Text(
                    "Ini ${Money.qty(r.stockInicial)}  V ${Money.qty(r.ventas)}  E ${Money.qty(r.entradas)}  S ${Money.qty(r.salidas)}  Calc ${Money.qty(r.stockCalculado)}  Final ${Money.qty(r.stockFinal)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text("Importe orig. ${Money.usd(r.importeOriginal)}  real ${Money.usd(r.importeReal)}  Δ ${Money.usd(r.diferenciaImporte)}")
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
