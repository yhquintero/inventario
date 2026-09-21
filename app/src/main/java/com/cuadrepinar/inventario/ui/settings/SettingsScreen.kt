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
import com.cuadrepinar.inventario.domain.model.UserAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(private val repo: SettingsRepository) : ViewModel() {
    var entity by mutableStateOf(SettingsEntity())
    fun load() { viewModelScope.launch { entity = repo.get() } }
    fun save(e: SettingsEntity) { viewModelScope.launch { repo.save(e); entity = e } }
}

@Composable
fun SettingsScreen(user: UserAccount, themeMode: String, vm: SettingsViewModel = hiltViewModel()) {
    LaunchedEffect(Unit) { vm.load() }
    var e by remember(vm.entity) { mutableStateOf(vm.entity) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Configuración", style = MaterialTheme.typography.headlineMedium)
        Text("Sesión: ${user.displayName} · ${user.role.label}")
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
        Text("Tema actual: $themeMode (el interruptor del encabezado recorre claro / oscuro / sistema)")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("light", "dark", "system").forEach { t ->
                FilterChip(selected = e.theme == t, onClick = { e = e.copy(theme = t) }, label = { Text(t) })
            }
        }
        Button(onClick = { vm.save(e) }, modifier = Modifier.fillMaxWidth()) { Text("Guardar ajustes") }
    }
}
