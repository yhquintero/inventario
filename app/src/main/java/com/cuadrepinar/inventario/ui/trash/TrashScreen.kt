package com.cuadrepinar.inventario.ui.trash

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import com.cuadrepinar.inventario.data.repository.ProductRepository
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.Product
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.ui.inventory.CategoryThumb
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TrashViewModel @Inject constructor(private val repo: ProductRepository) : ViewModel() {
    val items = repo.observeTrash().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    var message by mutableStateOf<String?>(null)
    fun restore(p: Product, u: UserAccount) = viewModelScope.launch {
        message = when (val r = repo.restore(p.id, u)) { is AppResult.Ok -> "«${p.name}» restaurado"; is AppResult.Err -> r.message }
    }
    fun purge(p: Product, u: UserAccount) = viewModelScope.launch {
        message = when (val r = repo.purge(p.id, u)) { is AppResult.Ok -> "«${p.name}» eliminado definitivamente"; is AppResult.Err -> r.message }
    }
}

/** Papelera de reciclaje: recupera productos eliminados (y sus movimientos). */
@Composable
fun TrashScreen(user: UserAccount, vm: TrashViewModel = hiltViewModel()) {
    val items by vm.items.collectAsState()
    var confirm by remember { mutableStateOf<Product?>(null) }
    val canPurge = RolePermissions.can(user.role, Permission.INVENTORY_DELETE)
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Papelera de reciclaje", style = MaterialTheme.typography.headlineMedium)
        Text("${items.size} producto(s). Los nombres de la papelera no se pueden repetir al crear productos.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        vm.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        if (items.isEmpty()) Text("La papelera está vacía. 🎉", Modifier.padding(top = 24.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items, key = { it.id }) { p ->
                Card(Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CategoryThumb(p.category)
                        Column(Modifier.weight(1f)) {
                            Text(p.name, style = MaterialTheme.typography.titleSmall)
                            Text("${p.category} · stock ${Money.qty(p.stockActual)} · ${Money.usd(p.precioVentaUsd)}", style = MaterialTheme.typography.bodySmall)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            OutlinedButton(onClick = { vm.restore(p, user) }) { Text("Restaurar") }
                            if (canPurge) TextButton(onClick = { confirm = p }) { Text("Eliminar", color = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
    }
    confirm?.let { p ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("¿Eliminar definitivamente?") },
            text = { Text("«${p.name}» y todos sus movimientos se borrarán para siempre. No se puede deshacer.") },
            confirmButton = { TextButton(onClick = { vm.purge(p, user); confirm = null }) { Text("Eliminar", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Cancelar") } }
        )
    }
}
