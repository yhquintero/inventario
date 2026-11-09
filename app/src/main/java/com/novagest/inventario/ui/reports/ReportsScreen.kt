package com.novagest.inventario.ui.reports

import android.app.DatePickerDialog
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.ui.components.ChipRow
import com.novagest.inventario.data.export.ExportManager
import com.novagest.inventario.data.repository.ProductRepository
import com.novagest.inventario.data.repository.ReportRepository
import com.novagest.inventario.domain.model.ComprobacionRow
import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.Permission
import com.novagest.inventario.domain.model.RolePermissions
import com.novagest.inventario.domain.model.SaleCenter
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.domain.usecase.DemandForecast
import com.novagest.inventario.ui.components.DonutChart
import com.novagest.inventario.ui.components.GradientBarChart
import com.novagest.inventario.ui.components.HeatCellUi
import com.novagest.inventario.ui.components.HeatmapCalendar
import com.novagest.inventario.ui.components.KpiCard
import com.novagest.inventario.ui.components.SectionTitle
import com.novagest.inventario.util.Dates
import com.novagest.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.abs
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PointOfSale
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.SwapHoriz

/** Fila de reposición sugerida (ritmo de venta de 30 días × cobertura). */
data class RestockRow(
    val name: String,
    val stock: Double,
    val avgDaily: Double,
    val daysLeft: Double,
    val buy: Double
)

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val reports: ReportRepository,
    private val products: ProductRepository,
    val exporter: ExportManager
) : ViewModel() {
    var rows by mutableStateOf<List<ComprobacionRow>>(emptyList())
    var movs by mutableStateOf<List<Movement>>(emptyList())
    var prevMovs by mutableStateOf<List<Movement>>(emptyList())
    var restock by mutableStateOf<List<RestockRow>>(emptyList())
    var heatMovs by mutableStateOf<List<Movement>>(emptyList())
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
        if (!validRange) { rows = emptyList(); movs = emptyList(); prevMovs = emptyList(); return }
        viewModelScope.launch {
            val fromEpoch = Dates.startOfDay(from)
            val toEpoch = Dates.endOfDay(to)
            rows = reports.comprobacion(fromEpoch, toEpoch)
            movs = reports.filtered(com.novagest.inventario.domain.model.ReportFilter(fromEpoch, toEpoch))
            // Período inmediatamente anterior de la misma duración, para el comparador.
            val days = java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1
            val prevTo = from.minusDays(1)
            val prevFrom = prevTo.minusDays(days - 1)
            prevMovs = reports.filtered(com.novagest.inventario.domain.model.ReportFilter(Dates.startOfDay(prevFrom), Dates.endOfDay(prevTo)))
        }
    }

    /** Reposición sugerida (30 días × cobertura 14 días) y serie de 10 semanas para el mapa de calor. */
    fun loadRestock() {
        viewModelScope.launch {
            val until = Dates.endOfDay(LocalDate.now())
            val movs70 = reports.filtered(com.novagest.inventario.domain.model.ReportFilter(Dates.startOfDay(LocalDate.now().minusDays(69)), until))
            heatMovs = movs70
            val since30 = Dates.startOfDay(LocalDate.now().minusDays(29))
            val movs30 = movs70.filter { it.dateEpoch >= since30 }
            val qtyByProduct = movs30
                .filter { it.type == MovementType.VENTA }
                .groupBy { it.productId }
                .mapValues { (_, list) -> list.sumOf { m -> m.quantity } }
            val prods = runCatching { products.observe().first() }.getOrDefault(emptyList())
            restock = prods
                .mapNotNull { p ->
                    val qty = qtyByProduct[p.id] ?: return@mapNotNull null
                    val avg = DemandForecast.averageDaily(qty, 30)
                    if (avg <= 0.0) return@mapNotNull null
                    val daysLeft = DemandForecast.daysOfStock(p.stockActual, avg)
                    val buy = DemandForecast.suggestedPurchase(avg, 14, p.stockActual)
                    RestockRow(p.name, p.stockActual, avg, daysLeft, buy)
                }
                .filter { it.buy > 0.0 || it.daysLeft <= 7.0 }
                .sortedBy { it.daysLeft }
                .take(5)
        }
    }

    fun setCustomFrom(date: LocalDate) { fromDate = date; load("período") }
    fun setCustomTo(date: LocalDate) { toDate = date; load("período") }
}

@Composable
fun ReportsScreen(user: UserAccount, vm: ReportsViewModel = hiltViewModel()) {
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.load("semanal"); vm.loadRestock() }
    val canExport = RolePermissions.can(user.role, Permission.REPORTS_EXPORT)
    val ventas = vm.movs.filter { it.type == MovementType.VENTA }
    val entradas = vm.movs.filter { it.type == MovementType.ENTRADA }
    val salidas = vm.movs.filter { it.type == MovementType.SALIDA }
    val range = vm.range()

    // Comparador: ventas del período vs. período anterior de igual duración.
    val curVentas = ventas.sumOf { it.importeUsd }
    val prevVentas = vm.prevMovs.filter { it.type == MovementType.VENTA }.sumOf { it.importeUsd }
    val deltaPct = if (prevVentas > 0.0) ((curVentas - prevVentas) / prevVentas) * 100.0 else null
    val deltaText = deltaPct?.let { (if (it >= 0) "▲ " else "▼ ") + String.format("%.1f", abs(it)) + " % vs. período anterior" }
    val deltaColor = if (deltaPct != null && deltaPct < 0.0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Reportes e informes", style = MaterialTheme.typography.headlineMedium)
            ChipRow(
                options = listOf("diario", "semanal", "mensual", "anual", "período"),
                selected = vm.period,
                label = { it.replaceFirstChar { c -> c.uppercase() } },
                onSelect = { vm.load(it) },
                modifier = Modifier.padding(top = 8.dp)
            )
        }
        item {
            if (vm.period == "período") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            val dialog = DatePickerDialog(context, { _, year, month, day -> vm.setCustomFrom(LocalDate.of(year, month + 1, day)) },
                                vm.fromDate.year, vm.fromDate.monthValue - 1, vm.fromDate.dayOfMonth)
                            dialog.datePicker.maxDate = System.currentTimeMillis()
                            dialog.show()
                        }, modifier = Modifier.weight(1f)
                    ) { Text("Desde ${Dates.format(Dates.startOfDay(vm.fromDate))}") }
                    OutlinedButton(
                        onClick = {
                            val dialog = DatePickerDialog(context, { _, year, month, day -> vm.setCustomTo(LocalDate.of(year, month + 1, day)) },
                                vm.toDate.year, vm.toDate.monthValue - 1, vm.toDate.dayOfMonth)
                            dialog.datePicker.maxDate = System.currentTimeMillis()
                            dialog.show()
                        }, modifier = Modifier.weight(1f)
                    ) { Text("Hasta ${Dates.format(Dates.startOfDay(vm.toDate))}") }
                }
            } else {
                OutlinedButton(onClick = {
                    val dialog = DatePickerDialog(context, { _, year, month, day ->
                        vm.load(vm.period, LocalDate.of(year, month + 1, day))
                    }, vm.anchorDate.year, vm.anchorDate.monthValue - 1, vm.anchorDate.dayOfMonth)
                    dialog.datePicker.maxDate = System.currentTimeMillis()
                    dialog.show()
                }) { Text("Fecha de referencia: ${Dates.format(Dates.startOfDay(vm.anchorDate))}") }
            }
            val label = "${Dates.format(Dates.startOfDay(range.first))} – ${Dates.format(Dates.startOfDay(range.second))}"
            Text(if (vm.validRange) "Período $label" else "Revisa el rango: la fecha inicial es posterior a la final.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(
                    "Ventas", Money.usd(curVentas), "${Money.qty(ventas.sumOf { it.quantity })} uds.",
                    Modifier.weight(1f), MaterialTheme.colorScheme.tertiary,
                    icon = Icons.Outlined.PointOfSale,
                    delta = deltaText, deltaColor = deltaColor
                )
                KpiCard(
                    "Utilidad bruta", Money.usd(vm.rows.sumOf { it.utilidadBruta }),
                    "costo histórico ${Money.usd(vm.rows.sumOf { it.costoVentas })}",
                    Modifier.weight(1f), MaterialTheme.colorScheme.primary,
                    icon = Icons.Outlined.TrendingUp
                )
                KpiCard(
                    "Entradas / salidas", "${Money.qty(entradas.sumOf { it.quantity })} / ${Money.qty(salidas.sumOf { it.quantity })}",
                    "unidades", Modifier.weight(1f), MaterialTheme.colorScheme.secondary,
                    icon = Icons.Outlined.SwapHoriz
                )
            }
        }
        item {
            SectionTitle("Ventas por centro")
            val gestor = ventas.filter { it.center == SaleCenter.GESTOR }.sumOf { it.importeUsd }
            val tienda = ventas.filter { it.center == SaleCenter.TIENDA }.sumOf { it.importeUsd }
            // Sin ventas el gráfico quedaba como un hueco en blanco; es más claro decirlo.
            if (gestor == 0.0 && tienda == 0.0) {
                Text(
                    "Sin ventas en este período: todavía no hay reparto entre tienda y gestor.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                GradientBarChart(listOf("GESTOR" to gestor.toFloat(), "TIENDA" to tienda.toFloat()))
            }
        }
        item {
            SectionTitle("Composición de movimientos")
            val totalUds = (ventas.sumOf { it.quantity } + entradas.sumOf { it.quantity } + salidas.sumOf { it.quantity }).toFloat()
            if (totalUds <= 0f) {
                Text(
                    "Sin movimientos en este período.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                DonutChart(
                    listOf(
                        "VENTA" to ventas.sumOf { it.quantity }.toFloat(),
                        "ENTRADA" to entradas.sumOf { it.quantity }.toFloat(),
                        "SALIDA" to salidas.sumOf { it.quantity }.toFloat()
                    ),
                    centerValue = Money.qty(totalUds.toDouble()),
                    centerLabel = "uds."
                )
            }
        }
        item {
            SectionTitle("🔥 Mapa de calor de ventas · 10 semanas")
            val heatRows = remember(vm.heatMovs) { HeatmapModel.grid(vm.heatMovs, LocalDate.now(), 10) }
            HeatmapCalendar(
                rows = heatRows.map { row ->
                    row.label to row.cells.map { cell ->
                        HeatCellUi(
                            dateLabel = cell.date.toString(),
                            contentDescription = cell.contentDescription,
                            level = cell.level,
                            future = cell.future
                        )
                    }
                }
            )
        }
        if (vm.restock.isNotEmpty()) {
            item { SectionTitle("Reposición sugerida · cubrir 14 días") }
            items(vm.restock, key = { "restock-" + it.name }) { r ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(r.name, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Stock ${Money.qty(r.stock)} · ritmo ${String.format("%.1f", r.avgDaily)}/día · ${if (r.daysLeft.isInfinite()) "sin fuga" else "alcanza para ~${r.daysLeft.toInt()} días"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (r.buy > 0.0) {
                        Text(
                            "Comprar ${Money.qty(r.buy)} uds.",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
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

private fun share(context: android.content.Context, uri: android.net.Uri, mime: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = mime
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Exportar"))
}
