package com.novagest.inventario.ui.home

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.data.printer.BluetoothPrinter
import com.novagest.inventario.data.printer.EscPos
import com.novagest.inventario.data.repository.CuadreRepository
import com.novagest.inventario.data.repository.MovementRepository
import com.novagest.inventario.data.repository.ProductRepository
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.domain.usecase.CuadreCalculator
import com.novagest.inventario.ui.components.KpiCard
import com.novagest.inventario.ui.components.SectionTitle
import com.novagest.inventario.util.Dates
import com.novagest.inventario.util.Money
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
    private val cuadreRepo: CuadreRepository,
    private val printer: BluetoothPrinter
) : ViewModel() {

    /** Respuesta de la reimpresión para mostrarla en la pantalla (A-15). */
    var printMessage by mutableStateOf<String?>(null)
        private set

    /** ¿Hay un ticket guardado del que sacar otra copia? */
    fun hasLastTicket(): Boolean = printer.lastTicket() != null

    /** Reimprime el último ticket con la impresora y el ancho de Ajustes. */
    fun reprintLast() {
        val ticket = printer.lastTicket() ?: run {
            printMessage = "Todavía no se ha impreso ningún ticket en este teléfono."
            return
        }
        printMessage = printer.print(printer.savedAddress, EscPos.build(ticket))
            ?: "🖨 Ticket reenviado a la impresora (${ticket.width.label})"
    }

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
    // A-15: reimprimir exige el mismo permiso de Bluetooth que imprimir.
    val context = LocalContext.current
    val blePermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) vm.reprintLast()
    }
    val doReprint: () -> Unit = {
        val needs = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
        if (needs) blePermission.launch(Manifest.permission.BLUETOOTH_CONNECT) else vm.reprintLast()
    }
    val saludo = when (java.time.LocalTime.now().hour) {
        in 5..11 -> "Buenos días"
        in 12..18 -> "Buenas tardes"
        else -> "Buenas noches"
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("$saludo, ${user.displayName.split(" ").first()}", style = MaterialTheme.typography.headlineMedium)
            Text("Hoy es ${Dates.formatLong(today)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Inventario · Venta · Caja · Análisis", color = MaterialTheme.colorScheme.tertiary, style = MaterialTheme.typography.labelLarge)
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Ventas de hoy", Money.usd(ventas), "${Money.qty(unidades)} uds.", Modifier.weight(1f), MaterialTheme.colorScheme.tertiary)
                KpiCard("Inventario", Money.usd(valorInventario), "${products.size} productos", Modifier.weight(1f), MaterialTheme.colorScheme.primary)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("Movimientos hoy", todayMovs.size.toString(), "VENTA / ENTRADA / SALIDA", Modifier.weight(1f), MaterialTheme.colorScheme.secondary)
                KpiCard("Stock bajo", low.size.toString(), if (low.isEmpty()) "Todo cubierto" else "Requieren reposición", Modifier.weight(1f), if (low.isEmpty()) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error)
            }
        }
        item {
            // A-15: segunda copia del último ticket sin volver a Venta rápida.
            if (vm.hasLastTicket()) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Último ticket", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Se estropeó el papel o el cliente lo quiere otra vez: sale una copia con la misma impresora.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                        Button(onClick = doReprint, modifier = Modifier.fillMaxWidth()) {
                            Text("🧾 Reimprimir último ticket")
                        }
                        vm.printMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }
        }
        item { SectionTitle("Alertas de stock") }
        if (low.isEmpty()) item { Text("Todo el inventario está por encima del mínimo.") }
        items(low.take(12), key = { it.id }) { p ->
            Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(p.name, style = MaterialTheme.typography.titleMedium)
                Text("Stock ${Money.qty(p.stockActual)} · mínimo ${Money.qty(p.minStock)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                val frac = if (p.minStock <= 0) 1f else (p.stockActual / (p.minStock * 3)).toFloat().coerceIn(0f, 1f)
                LinearProgressIndicator(
                    progress = { frac },
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    color = if (p.stockActual <= 0) MaterialTheme.colorScheme.error else if (frac < 0.5f) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.tertiary
                )
            }
        }
        item { SectionTitle("Últimos movimientos") }
        items(movs.take(10), key = { it.id }) { m ->
            val typeColor = when (m.type) {
                MovementType.VENTA -> MaterialTheme.colorScheme.primary
                MovementType.ENTRADA -> MaterialTheme.colorScheme.tertiary
                else -> MaterialTheme.colorScheme.error
            }
            Column(Modifier.padding(vertical = 4.dp)) {
                Text("${m.type.name} · ${m.productName}", style = MaterialTheme.typography.titleMedium, color = typeColor)
                Text("${Money.qty(m.quantity)} · ${Money.usd(m.importeUsd)} · ${m.center.name} · ${Dates.format(m.dateEpoch)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
