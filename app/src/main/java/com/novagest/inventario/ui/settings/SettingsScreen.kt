package com.novagest.inventario.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.data.local.entity.SettingsEntity
import com.novagest.inventario.data.printer.BluetoothPrinter
import com.novagest.inventario.data.printer.EscPos
import com.novagest.inventario.data.printer.PaperWidth
import com.novagest.inventario.data.printer.TicketData
import com.novagest.inventario.data.printer.TicketLine
import com.novagest.inventario.data.repository.SettingsRepository
import com.novagest.inventario.data.sync.SyncManager
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.collectAsState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import java.text.DateFormat
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Date
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.ui.components.ChipRow
import com.novagest.inventario.ui.components.SyncHint
import android.content.Context
import com.novagest.inventario.worker.WorkScheduler
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repo: SettingsRepository,
    val sync: SyncManager,
    val appLock: com.novagest.inventario.security.AppLock,
    private val printer: BluetoothPrinter,
    @ApplicationContext private val context: Context
) : ViewModel() {

    /** Aviso de cierre de las 20:00 (A-08): se guarda en las preferencias del teléfono. */
    private val prefs = context.getSharedPreferences("reminders", Context.MODE_PRIVATE)
    var dayCloseEnabled by mutableStateOf(prefs.getBoolean("dayClose", true))
        private set

    fun setDayClose(enabled: Boolean) {
        dayCloseEnabled = enabled
        prefs.edit().putBoolean("dayClose", enabled).apply()
        WorkScheduler.scheduleDayClose(context, enabled)
    }
    var entity by mutableStateOf(SettingsEntity())

    /** Impresora y ancho del papel elegidos en Ajustes (A-14). */
    var printers by mutableStateOf(printer.paired())
    var printerAddress by mutableStateOf(printer.savedAddress)
    var printerWidth by mutableStateOf(printer.savedWidth)
    var printerMessage by mutableStateOf<String?>(null)

    fun load() {
        viewModelScope.launch {
            entity = repo.get()
            refreshPrinters()
        }
    }

    fun save(e: SettingsEntity) { viewModelScope.launch { repo.save(e); entity = e } }

    /** Vuelve a leer las impresoras emparejadas (por ejemplo, tras dar el permiso). */
    fun refreshPrinters() {
        printers = printer.paired()
        printerAddress = printer.savedAddress
        printerWidth = printer.savedWidth
        printerMessage = if (printers.isEmpty()) "No hay impresoras emparejadas: empareja la tuya en los ajustes de Bluetooth del teléfono." else null
    }

    fun savePrinter() {
        if (printerAddress.isBlank()) { printerMessage = "Elige una impresora de la lista."; return }
        printer.remember(printerAddress, printerWidth)
        printerMessage = "Impresora guardada: ${'$'}{printerWidth.label}."
    }

    fun printTest() {
        viewModelScope.launch {
            val ticket = TicketData(
                businessName = entity.businessName.ifBlank { "NovaGest" },
                date = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")),
                lines = listOf(TicketLine("Producto de prueba", 1.0, 1.0, 1.0)),
                totalUsd = 1.0,
                rateCupUsd = entity.defaultCupUsd,
                paymentType = "CONTADO",
                seller = "Prueba",
                width = printerWidth
            )
            printerMessage = printer.print(printerAddress, EscPos.build(ticket)) ?: "✔ Ticket de prueba enviado a la impresora."
        }
    }
}

@Composable
fun SettingsScreen(user: UserAccount, themeMode: String, vm: SettingsViewModel = hiltViewModel()) {
    LaunchedEffect(Unit) { vm.load() }
    var e by remember(vm.entity) { mutableStateOf(vm.entity) }
    var lockEnabled by remember { mutableStateOf(vm.appLock.enabled) }
    val sync by vm.sync.status.collectAsState()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Configuración", style = MaterialTheme.typography.headlineMedium)
        Text("Sesión: ${user.displayName} · ${user.role.label}")
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Servidor compartido con la Web", style = MaterialTheme.typography.titleMedium)
                if (sync.connected) {
                    Text("Conectado a ${sync.server} como ${sync.user} (${sync.role})")
                    Text("Versión de datos: ${sync.version}" + if (sync.lastSync > 0) " · última sincronización ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(sync.lastSync))}" else "")
                    if (sync.closedDays.isNotEmpty()) Text("Días cerrados: ${sync.closedDays.sorted().takeLast(5).joinToString()}", style = MaterialTheme.typography.bodySmall)
                    Text("Los cambios se suben solos; si otra persona guardó antes, o el día está cerrado, se recargan los datos del servidor.", style = MaterialTheme.typography.bodySmall)
                    Button(onClick = { vm.sync.syncNow() }, enabled = !sync.busy, modifier = Modifier.fillMaxWidth()) { Text(if (sync.busy) "Sincronizando…" else "Sincronizar ahora") }
                } else {
                    Text("Modo local: los datos solo están en este teléfono. Para compartirlos con la Web, cierra sesión y escribe la dirección del servidor en la pantalla de acceso.")
                }
                // A-17: cuántos cambios quedan sin subir y cuándo se reintentan.
                Text(SyncHint.settingsSummary(sync.pending, sync.retryIn), style = MaterialTheme.typography.bodySmall)
                sync.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            }
        }
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Impresora de tickets", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Empareja la impresora en los ajustes de Bluetooth del teléfono y elígela aquí. La app recuerda la impresora y el ancho del papel.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (vm.printers.isEmpty()) {
                    OutlinedButton(onClick = { vm.refreshPrinters() }, modifier = Modifier.fillMaxWidth()) {
                        Text("Buscar impresoras emparejadas")
                    }
                } else {
                    vm.printers.forEach { d ->
                        FilterChip(
                            selected = vm.printerAddress == d.address,
                            onClick = { vm.printerAddress = d.address },
                            label = { Text(d.name) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
                Text("Ancho del papel", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(PaperWidth.MM_58, PaperWidth.MM_80).forEach { w ->
                        FilterChip(selected = vm.printerWidth == w, onClick = { vm.printerWidth = w }, label = { Text(w.label) })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { vm.savePrinter() }, enabled = vm.printerAddress.isNotBlank()) { Text("Guardar impresora") }
                    OutlinedButton(onClick = { vm.printTest() }, enabled = vm.printerAddress.isNotBlank()) { Text("Imprimir prueba") }
                }
                vm.printerMessage?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
        OutlinedTextField(e.businessName, { e = e.copy(businessName = it) }, label = { Text("Nombre del negocio") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(e.defaultCupUsd.toString(), { e = e.copy(defaultCupUsd = it.toDoubleOrNull() ?: e.defaultCupUsd) }, label = { Text("CUP/USD por defecto") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(e.defaultMxnUsd.toString(), { e = e.copy(defaultMxnUsd = it.toDoubleOrNull() ?: e.defaultMxnUsd) }, label = { Text("MXN/USD por defecto") }, modifier = Modifier.fillMaxWidth())
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Alertas de stock bajo")
            Switch(e.lowStockAlerts, { e = e.copy(lowStockAlerts = it) })
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Copia automática diaria")
            Switch(e.autoBackupEnabled, { e = e.copy(autoBackupEnabled = it) })
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Aviso de cierre a las ${com.novagest.inventario.domain.usecase.DayCloseCheck.HOUR}:00")
                Text(
                    "Si hubo ventas y el día no está cuadrado, el teléfono avisa a esa hora.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(vm.dayCloseEnabled, { vm.setDayClose(it) })
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Bloquear al abrir")
                Text(
                    "Pide huella o rostro cada vez que abras la app.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(lockEnabled, { lockEnabled = it; vm.appLock.enabled = it })
        }
        Text("Tema actual: $themeMode. El botón del encabezado recorre claro / oscuro / sistema y la elección queda guardada: se aplica al instante y sobrevive al reinicio de la app.")
        ChipRow(
            options = listOf("light", "dark", "system"),
            selected = e.theme,
            label = { it },
            onSelect = { e = e.copy(theme = it) }
        )
        Button(onClick = { vm.save(e) }, modifier = Modifier.fillMaxWidth()) { Text("Guardar ajustes") }
    }
}
