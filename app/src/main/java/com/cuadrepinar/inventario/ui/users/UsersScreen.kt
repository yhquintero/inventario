package com.cuadrepinar.inventario.ui.users

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.repository.UserRepository
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.Role
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.UserAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class UsersViewModel @Inject constructor(private val repo: UserRepository) : ViewModel() {
    val users = repo.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    var msg by mutableStateOf<String?>(null)
    fun save(a: UserAccount, pass: String?, actor: UserAccount, q: String, ans: String?) {
        viewModelScope.launch {
            msg = when (val r = repo.save(a, pass, actor, q, ans)) {
                is com.cuadrepinar.inventario.domain.model.AppResult.Ok -> "Usuario guardado"
                is com.cuadrepinar.inventario.domain.model.AppResult.Err -> r.message
            }
        }
    }
    fun toggle(id: Long, active: Boolean, actor: UserAccount) {
        viewModelScope.launch { repo.setActive(id, active, actor) }
    }
}

@Composable
fun UsersScreen(user: UserAccount, vm: UsersViewModel = hiltViewModel()) {
    val users by vm.users.collectAsState()
    val canEdit = RolePermissions.can(user.role, Permission.USERS_EDIT)
    var open by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<UserAccount?>(null) }

    Scaffold(floatingActionButton = {
        if (canEdit) FloatingActionButton(onClick = {
            editing = UserAccount(username = "", displayName = "", email = "", role = Role.ALMACENERO)
            open = true
        }) { Icon(Icons.Outlined.Add, "Nuevo") }
    }) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item { Text("Usuarios y roles", style = MaterialTheme.typography.headlineMedium) }
            vm.msg?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
            items(users, key = { it.id }) { u ->
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(u.displayName, style = MaterialTheme.typography.titleMedium)
                        Text("${u.username} · ${u.role.label} · ${u.email}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (canEdit) {
                        Switch(checked = u.active, onCheckedChange = { vm.toggle(u.id, it, user) })
                    }
                }
            }
        }
    }
    if (open && editing != null) {
        UserDialog(editing!!, onDismiss = { open = false }) { acc, pass, q, ans ->
            vm.save(acc, pass, user, q, ans); open = false
        }
    }
}

@Composable
private fun UserDialog(account: UserAccount, onDismiss: () -> Unit, onSave: (UserAccount, String?, String, String?) -> Unit) {
    var username by remember { mutableStateOf(account.username) }
    var name by remember { mutableStateOf(account.displayName) }
    var email by remember { mutableStateOf(account.email) }
    var role by remember { mutableStateOf(account.role) }
    var pass by remember { mutableStateOf("") }
    var q by remember { mutableStateOf(account.securityQuestion.ifBlank { "¿Ciudad de la tienda?" }) }
    var ans by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Usuario") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(username, { username = it }, label = { Text("Usuario") }, singleLine = true)
                OutlinedTextField(name, { name = it }, label = { Text("Nombre") }, singleLine = true)
                OutlinedTextField(email, { email = it }, label = { Text("Correo") }, singleLine = true)
                OutlinedTextField(pass, { pass = it }, label = { Text("Contraseña") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Role.entries.forEach { r ->
                        FilterChip(selected = role == r, onClick = { role = r }, label = { Text(r.label) })
                    }
                }
                OutlinedTextField(q, { q = it }, label = { Text("Pregunta de seguridad") })
                OutlinedTextField(ans, { ans = it }, label = { Text("Respuesta") })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(account.copy(username = username, displayName = name, email = email, role = role), pass.ifBlank { null }, q, ans.ifBlank { null })
            }) { Text("Guardar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } }
    )
}
