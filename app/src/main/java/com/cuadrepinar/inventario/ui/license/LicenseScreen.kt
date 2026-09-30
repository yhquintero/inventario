package com.cuadrepinar.inventario.ui.license

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.security.LicenseManager
import com.cuadrepinar.inventario.security.LicenseStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LicenseUiState(
    val loading: Boolean = true,
    val status: LicenseStatus? = null,
    val error: String? = null,
    val activating: Boolean = false,
    val success: String? = null
)

@HiltViewModel
class LicenseViewModel @Inject constructor(
    private val licenseManager: LicenseManager,
    private val sync: com.cuadrepinar.inventario.data.sync.SyncManager
) : ViewModel() {
    private val _state = MutableStateFlow(LicenseUiState())
    val state: StateFlow<LicenseUiState> = _state

    fun server(): String = sync.server()

    fun check() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val st = licenseManager.fetchStatus(server())
            _state.value = LicenseUiState(loading = false, status = st, error = if (!st.valid) st.reason else null)
        }
    }

    fun activate(key: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(activating = true, error = null, success = null)
            val res = licenseManager.activate(server(), key)
            res.onSuccess { st ->
                _state.value = LicenseUiState(loading = false, status = st, success = "Licencia activada para ${st.clientName}")
            }.onFailure { e ->
                _state.value = _state.value.copy(activating = false, error = e.message)
                return@launch
            }
            _state.value = _state.value.copy(activating = false)
        }
    }

    init {
        check()
    }
}

@Composable
fun LicenseScreen(
    vm: LicenseViewModel = hiltViewModel(),
    onLicenseValid: () -> Unit
) {
    val state by vm.state.collectAsState()
    var key by remember { mutableStateOf("") }

    LaunchedEffect(state.status?.valid) {
        if (state.status?.valid == true) {
            // Espera un poco para mostrar éxito y luego continúa
            if (state.success != null) {
                kotlinx.coroutines.delay(1200)
            }
            onLicenseValid()
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Outlined.VerifiedUser, contentDescription = null, modifier = Modifier.padding(12.dp), tint = MaterialTheme.colorScheme.primary)
        Text("Licencia de Uso", style = MaterialTheme.typography.headlineMedium)
        Text("Acceso protegido por licencia", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))

        if (state.loading) {
            CircularProgressIndicator()
            Spacer(Modifier.height(12.dp))
            Text("Verificando licencia en el servidor…", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text("El acceso a todas las Apps se verifica siempre primero por la licencia de uso.", style = MaterialTheme.typography.bodySmall)
        } else {
            val st = state.status
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    if (st?.valid == true) {
                        Text("✔ Licencia válida", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(8.dp))
                        Text("${st.clientName} · ${st.product}")
                        Text("Tipo: ${st.type} · ID: ${st.licenseId}", style = MaterialTheme.typography.bodySmall)
                        Text("Expira: ${st.expiresText()}", style = MaterialTheme.typography.bodySmall)
                        if (st.isExpiringSoon) {
                            Spacer(Modifier.height(8.dp))
                            Text("⚠ Vence en ${st.daysLeft} días. Renueve pronto.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    } else {
                        Text("⛔ Licencia no válida", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(8.dp))
                        Text(st?.reason ?: "No hay licencia activa. Active una licencia para continuar.", style = MaterialTheme.typography.bodySmall)
                        if (st?.hasLicense == true) {
                            Text("La licencia anterior expiró o fue revocada.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = key,
                onValueChange = { key = it },
                label = { Text("Clave de licencia (CP-...)") },
                placeholder = { Text("Pegue la clave completa con punto") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = { vm.activate(key) },
                enabled = !state.activating && key.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (state.activating) CircularProgressIndicator(Modifier.padding(end = 8.dp)) else Text(if (st?.valid == true) "Actualizar licencia" else "Activar licencia")
            }

            Spacer(Modifier.height(8.dp))

            OutlinedButton(
                onClick = { vm.check() },
                modifier = Modifier.fillMaxWidth()
            ) { Text("↻ Verificar de nuevo") }

            state.error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }
            state.success?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.primary)
            }

            Spacer(Modifier.height(16.dp))

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("Protección de acceso", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(6.dp))
                    Text("• Verificación criptográfica HMAC-SHA256", style = MaterialTheme.typography.bodySmall)
                    Text("• Control de expiración y dispositivos", style = MaterialTheme.typography.bodySmall)
                    Text("• Bloqueo total sin licencia válida", style = MaterialTheme.typography.bodySmall)
                    Text("• Verificación siempre primero antes de login", style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(8.dp))
                    Text("Servidor: ${vm.server().ifBlank { "No configurado - configure en login" }}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
