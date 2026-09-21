package com.cuadrepinar.inventario.ui.auth

import android.app.Activity
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.R
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.data.repository.AuthRepository
import com.cuadrepinar.inventario.security.BiometricHelper
import com.cuadrepinar.inventario.security.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthState(
    val loading: Boolean = false,
    val error: String? = null,
    val user: UserAccount? = null,
    val recovering: Boolean = false,
    val question: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: AuthRepository,
    val session: SessionManager
) : ViewModel() {
    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state

    init {
        viewModelScope.launch {
            _state.value = _state.value.copy(user = auth.restoreSession())
        }
    }

    fun login(user: String, pass: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            when (val r = auth.login(user, pass)) {
                is AppResult.Ok -> _state.value = AuthState(user = r.value)
                is AppResult.Err -> _state.value = _state.value.copy(loading = false, error = r.message)
            }
        }
    }

    fun loginBiometric(id: Long) {
        viewModelScope.launch {
            when (val r = auth.loginById(id)) {
                is AppResult.Ok -> _state.value = AuthState(user = r.value)
                is AppResult.Err -> _state.value = _state.value.copy(error = r.message)
            }
        }
    }

    fun loadQuestion(username: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(recovering = true, question = auth.securityQuestion(username), error = null)
        }
    }

    fun recover(username: String, answer: String, newPass: String) {
        viewModelScope.launch {
            when (val r = auth.recoverPassword(username, answer, newPass)) {
                is AppResult.Ok -> _state.value = _state.value.copy(recovering = false, error = "Contraseña actualizada. Inicia sesión.")
                is AppResult.Err -> _state.value = _state.value.copy(error = r.message)
            }
        }
    }

    fun logout() {
        auth.logout()
        _state.value = AuthState()
    }

    fun clearError() { _state.value = _state.value.copy(error = null) }
}

@Composable
fun LoginScreen(vm: AuthViewModel = hiltViewModel(), onLogged: (UserAccount) -> Unit) {
    val state by vm.state.collectAsState()
    var user by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var answer by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    val context = LocalContext.current
    val helper = remember { BiometricHelper(context) }

    LaunchedEffect(state.user) { state.user?.let(onLogged) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(painterResource(R.drawable.ic_launcher), "Cuadre Pinar", Modifier.size(88.dp))
        Spacer(Modifier.height(12.dp))
        Text("Cuadre Pinar", style = MaterialTheme.typography.headlineMedium)
        Text("Control de inventario y cuadre diario", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(28.dp))
        if (state.recovering) {
            OutlinedTextField(user, { user = it }, label = { Text("Usuario") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            Text(state.question ?: "Escribe tu usuario y pulsa continuar.")
            OutlinedTextField(answer, { answer = it }, label = { Text("Respuesta de seguridad") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(newPass, { newPass = it }, label = { Text("Nueva contraseña") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            Button(onClick = { if (state.question == null) vm.loadQuestion(user) else vm.recover(user, answer, newPass) }, modifier = Modifier.fillMaxWidth()) {
                Text(if (state.question == null) "Buscar pregunta" else "Restablecer")
            }
            TextButton(onClick = { vm.logout() }) { Text("Volver al acceso") }
        } else {
            OutlinedTextField(user, { user = it }, label = { Text("Usuario") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                pass, { pass = it }, label = { Text("Contraseña") }, singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    if (helper.canAuthenticate() && vm.session.isLoggedIn()) {
                        IconButton(onClick = {
                            val act = context as? FragmentActivity ?: return@IconButton
                            helper.prompt(act, onSuccess = { vm.loginBiometric(vm.session.userId()) }, onError = {})
                        }) { Icon(Icons.Outlined.Fingerprint, "Biometría") }
                    }
                }
            )
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { vm.login(user, pass) },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (state.loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Entrar")
            }
            if (helper.canAuthenticate()) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        val act = (context as? FragmentActivity) ?: (context as? Activity)
                        if (act is FragmentActivity) {
                            helper.prompt(act, onSuccess = {
                                val id = vm.session.userId()
                                if (id > 0) vm.loginBiometric(id)
                            }, onError = {})
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Entrar con huella o Face ID") }
            }
            TextButton(onClick = { vm.loadQuestion(user) }) { Text("Olvidé mi contraseña") }
        }
        state.error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(24.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Cuentas de demostración", style = MaterialTheme.typography.titleMedium)
                Text("admin / Admin123!  ·  Administrador", style = MaterialTheme.typography.bodyMedium)
                Text("jefe / Jefe123!  ·  Jefe", style = MaterialTheme.typography.bodyMedium)
                Text("economico / Eco123!  ·  Económico", style = MaterialTheme.typography.bodyMedium)
                Text("almacenero / Alma123!  ·  Almacenero", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
