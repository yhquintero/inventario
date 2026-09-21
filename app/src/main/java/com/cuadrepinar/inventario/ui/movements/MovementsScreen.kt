package com.cuadrepinar.inventario.ui.movements

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
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.repository.MovementRepository
import com.cuadrepinar.inventario.data.repository.ProductRepository
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.ui.components.SearchField
import com.cuadrepinar.inventario.util.Dates
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class MovementViewModel @Inject constructor(
    private val repo: MovementRepository,
    products: ProductRepository
) : ViewModel() {
    val movements = repo.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val products = products.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    var message by mutableStateOf<String?>(null)

    fun add(productId: Long, type: MovementType, qty: Double, center: SaleCenter, actor: UserAccount, notes: String, price: Double?) {
        viewModelScope.launch {
            message = when (val r = repo.register(productId, type, qty, center, LocalDate.now(), actor, notes, price)) {
                is AppResult.Ok -> "Movimiento registrado. Stock actualizado."
                is AppResult.Err -> r.message
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovementsScreen(user: UserAccount, vm: MovementViewModel = hiltViewModel()) {
    val movs by vm.movements.collectAsState()
    val products by vm.products.collectAsState()
    var q by remember { mutableStateOf("") }
    var typeFilter by remember { mutableStateOf("TODOS") }
    var open by remember { mutableStateOf(false) }
    val canCreate = RolePermissions.can(user.role, Permission.MOVEMENT_CREATE)
    val filtered = movs.filter {
        (typeFilter == "TODOS" || it.type.name == typeFilter) &&
            (q.isBlank() || it.productName.contains(q, true) || it.center.name.contains(q, true))
    }

    Scaffold(floatingActionButton = {
        if (canCreate) FloatingActionButton(onClick = { open = true }) { Icon(Icons.Outlined.Add, "Registrar") }
    }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
            SearchField(q, { q = it }, "Buscar por producto o centro")
            Row(Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("TODOS", "VENTA", "ENTRADA", "SALIDA").forEach { t ->
                    FilterChip(selected = typeFilter == t, onClick = { typeFilter = t }, label = { Text(t) })
                }
            }
            vm.message?.let { Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp)) }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filtered, key = { it.id }) { m ->
                    Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                        Text("${m.type.name} · ${m.productName}", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "${Dates.format(m.dateEpoch)}  ·  ${Money.qty(m.quantity)}  ·  ${Money.usd(m.importeUsd)}  ·  ${m.center.name}  ·  stock ${Money.qty(m.stockInicial)}→${Money.qty(m.stockFinal)}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    if (open) {
        var expandedP by remember { mutableStateOf(false) }
        var productId by remember { mutableStateOf(products.firstOrNull()?.id ?: 0L) }
        var type by remember { mutableStateOf(MovementType.VENTA) }
        var center by remember { mutableStateOf(SaleCenter.TIENDA) }
        var qty by remember { mutableStateOf("1") }
        var notes by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { open = false },
            title = { Text("Nuevo movimiento") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ExposedDropdownMenuBox(expandedP, { expandedP = it }) {
                        val label = products.firstOrNull { it.id == productId }?.name ?: "Producto"
                        OutlinedTextField(
                            label, {}, readOnly = true, label = { Text("PRODUCTO") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandedP) },
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )
                        ExposedDropdownMenu(expandedP, { expandedP = false }) {
                            products.filter { it.active }.forEach {
                                DropdownMenuItem(text = { Text("${it.name}  (${Money.qty(it.stockActual)})") }, onClick = { productId = it.id; expandedP = false })
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MovementType.entries.forEach { t ->
                            FilterChip(selected = type == t, onClick = { type = t; if (t != MovementType.VENTA) center = SaleCenter.MOV }, label = { Text(t.name) })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SaleCenter.entries.forEach { c ->
                            FilterChip(selected = center == c, onClick = { center = c }, label = { Text(c.name) })
                        }
                    }
                    OutlinedTextField(qty, { qty = it }, label = { Text("CANTIDAD") }, singleLine = true)
                    OutlinedTextField(notes, { notes = it }, label = { Text("Observación") })
                    val p = products.firstOrNull { it.id == productId }
                    if (p != null) {
                        Text("Precio lista ${Money.usd(p.precioVentaUsd)} · Comisión ${Money.cup(p.comisionCup)} · Stock ${Money.qty(p.stockActual)}")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    vm.add(productId, type, qty.toDoubleOrNull() ?: 0.0, center, user, notes, null)
                    open = false
                }) { Text("Registrar") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancelar") } }
        )
    }
}
