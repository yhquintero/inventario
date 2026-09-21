package com.cuadrepinar.inventario.ui.inventory

import androidx.compose.foundation.clickable
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
import com.cuadrepinar.inventario.data.repository.ProductRepository
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.Product
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.ui.components.SearchField
import com.cuadrepinar.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InventoryViewModel @Inject constructor(private val repo: ProductRepository) : ViewModel() {
    val products = repo.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    var message by mutableStateOf<String?>(null)

    fun save(p: Product, actor: UserAccount) {
        viewModelScope.launch {
            message = when (val r = repo.save(p, actor)) {
                is com.cuadrepinar.inventario.domain.model.AppResult.Ok -> "Producto guardado"
                is com.cuadrepinar.inventario.domain.model.AppResult.Err -> r.message
            }
        }
    }

    fun delete(p: Product, actor: UserAccount) {
        viewModelScope.launch { repo.delete(p, actor) }
    }
}

@Composable
fun InventoryScreen(user: UserAccount, vm: InventoryViewModel = hiltViewModel()) {
    val products by vm.products.collectAsState()
    var q by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Product?>(null) }
    var creating by remember { mutableStateOf(false) }
    val canEdit = RolePermissions.can(user.role, Permission.INVENTORY_EDIT)
    val filtered = products.filter { it.name.contains(q, true) || it.category.contains(q, true) }

    Scaffold(
        floatingActionButton = {
            if (canEdit) FloatingActionButton(onClick = { creating = true; editing = Product(name = "", stockInicial = 0.0, stockActual = 0.0, precioVentaUsd = 0.0, comisionCup = 0.0) }) {
                Icon(Icons.Outlined.Add, "Nuevo")
            }
        }
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
            SearchField(q, { q = it }, "Buscar producto o categoría")
            Text("${filtered.size} productos", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filtered, key = { it.id }) { p ->
                    Column(
                        Modifier.fillMaxWidth().clickable(enabled = canEdit) { editing = p; creating = true }.padding(vertical = 8.dp)
                    ) {
                        Text(p.name, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Stock ${Money.qty(p.stockActual)}  ·  Precio ${Money.usd(p.precioVentaUsd)}  ·  Comisión ${Money.cup(p.comisionCup)}  ·  ${p.category}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    val form = editing
    if (creating && form != null) {
        ProductDialog(
            product = form,
            canDelete = RolePermissions.can(user.role, Permission.INVENTORY_DELETE) && form.id != 0L,
            onDismiss = { creating = false; editing = null },
            onSave = { vm.save(it, user); creating = false },
            onDelete = { vm.delete(it, user); creating = false }
        )
    }
}

@Composable
private fun ProductDialog(
    product: Product,
    canDelete: Boolean,
    onDismiss: () -> Unit,
    onSave: (Product) -> Unit,
    onDelete: (Product) -> Unit
) {
    var name by remember { mutableStateOf(product.name) }
    var stock by remember { mutableStateOf(product.stockInicial.toString()) }
    var price by remember { mutableStateOf(product.precioVentaUsd.toString()) }
    var comm by remember { mutableStateOf(product.comisionCup.toString()) }
    var min by remember { mutableStateOf(product.minStock.toString()) }
    var cat by remember { mutableStateOf(product.category) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (product.id == 0L) "Nuevo producto" else "Editar producto") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("PRODUCTOS") }, singleLine = true)
                OutlinedTextField(stock, { stock = it }, label = { Text("STOCK INICIAL") }, singleLine = true)
                OutlinedTextField(price, { price = it }, label = { Text("PRECIO VENTA (USD)") }, singleLine = true)
                OutlinedTextField(comm, { comm = it }, label = { Text("COMISION (CUP)") }, singleLine = true)
                OutlinedTextField(min, { min = it }, label = { Text("Stock mínimo") }, singleLine = true)
                OutlinedTextField(cat, { cat = it }, label = { Text("Categoría") }, singleLine = true)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    product.copy(
                        name = name,
                        stockInicial = stock.toDoubleOrNull() ?: 0.0,
                        stockActual = if (product.id == 0L) stock.toDoubleOrNull() ?: 0.0 else product.stockActual,
                        precioVentaUsd = price.toDoubleOrNull() ?: 0.0,
                        comisionCup = comm.toDoubleOrNull() ?: 0.0,
                        minStock = min.toDoubleOrNull() ?: 1.0,
                        category = cat
                    )
                )
            }) { Text("Guardar") }
        },
        dismissButton = {
            Row {
                if (canDelete) TextButton(onClick = { onDelete(product) }) { Text("Eliminar") }
                TextButton(onClick = onDismiss) { Text("Cancelar") }
            }
        }
    )
}
