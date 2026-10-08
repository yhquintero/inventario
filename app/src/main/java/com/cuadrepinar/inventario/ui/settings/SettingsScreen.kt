package com.cuadrepinar.inventario.ui.settings

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
import com.cuadrepinar.inventario.data.local.entity.SettingsEntity
import com.cuadrepinar.inventario.data.repository.SettingsRepository
import com.cuadrepinar.inventario.data.sync.SyncManager
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.collectAsState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import java.text.DateFormat
import java.util.Date
import com.cuadrepinar.inventario.domain.model.UserAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(private val repo: SettingsRepository, val sync: SyncManager) : ViewModel() {
    var entity by mutableStateOf(SettingsEntity())
    fun load() { viewModelScope.launch { entity = repo.get() } }
    fun save(e: SettingsEntity) { viewModelScope.launch { repo.save(e); entity = e } }
}

@Composable
fun SettingsScreen(user: UserAccount, themeMode: String, vm: SettingsViewModel = hiltViewModel()) {
    LaunchedEffect(Unit) { vm.load() }
    var e by remember(vm.entity) { mutableStateOf(vm.entity) }
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
                sync.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
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
        Text("Tema actual: $themeMode. El botón del encabezado recorre claro / oscuro / sistema y la elección queda guardada: se aplica al instante y sobrevive al reinicio de la app.")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("light", "dark", "system").forEach { t ->
                FilterChip(selected = e.theme == t, onClick = { e = e.copy(theme = t) }, label = { Text(t) })
            }
        }
        Button(onClick = { vm.save(e) }, modifier = Modifier.fillMaxWidth()) { Text("Guardar ajustes") }
    }
}
