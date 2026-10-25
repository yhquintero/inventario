package com.novagest.inventario.ui.pos

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.data.repository.MovementRepository
import com.novagest.inventario.data.repository.ProductRepository
import com.novagest.inventario.domain.model.AppResult
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.Product
import com.novagest.inventario.domain.model.SaleCenter
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.ui.components.ChipRow
import com.novagest.inventario.ui.components.SearchField
import com.novagest.inventario.ui.inventory.CategoryThumb
import com.novagest.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class CartLine(val product: Product, val qty: Int)

@HiltViewModel
class PosViewModel @Inject constructor(
    products: ProductRepository,
    private val movements: MovementRepository,
    private val sync: com.novagest.inventario.data.sync.SyncManager
) : ViewModel() {
    val products = products.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val cart = mutableStateListOf<CartLine>()
    var message by mutableStateOf<String?>(null)
    var busy by mutableStateOf(false)

    fun add(p: Product) {
        val i = cart.indexOfFirst { it.product.id == p.id }
        val current = if (i >= 0) cart[i].qty else 0
        if (current + 1 > p.stockActual) { message = "Solo hay ${Money.qty(p.stockActual)} de ${p.name}."; return }
        if (i >= 0) cart[i] = cart[i].copy(qty = current + 1) else cart += CartLine(p, 1)
        message = null
    }

    fun dec(line: CartLine) {
        val i = cart.indexOf(line)
        if (i < 0) return
        if (line.qty <= 1) cart.removeAt(i) else cart[i] = line.copy(qty = line.qty - 1)
    }

    val total get() = cart.sumOf { it.qty * it.product.precioVentaUsd }

    fun customers() = sync.customers()

    /** Escáner wedge/manual: un código exacto añade el producto al carrito. */
    fun addByBarcode(raw: String) {
        val code = raw.filter { !it.isWhitespace() }
        if (code.isBlank()) return
        val p = products.value.firstOrNull { it.barcode.equals(code, true) }
        if (p == null) { message = "Código no encontrado: $code"; return }
        add(p)
    }

    fun checkout(center: SaleCenter, actor: UserAccount, paymentType: String = "CONTADO", customerId: String = "", dueDate: String = "") {
        if (cart.isEmpty() || busy) return
        val isFiado = paymentType == "FIADO"
        if (isFiado && customerId.isBlank()) { message = "Elige el cliente del fiado."; return }
        busy = true
        viewModelScope.launch {
            val done = mutableListOf<CartLine>()
            var error: String? = null
            for (line in cart.toList()) {
                when (val r = movements.register(line.product.id, MovementType.VENTA, line.qty.toDouble(), center, LocalDate.now(), actor, if (isFiado) "Venta rápida a fiado (App)" else "Venta rápida (App)")) {
                    is AppResult.Ok -> done += line
                    is AppResult.Err -> { error = "${line.product.name}: ${r.message}"; break }
                }
            }
            val sum = done.sumOf { it.qty * it.product.precioVentaUsd }
            cart.removeAll(done)
            message = when {
                error != null -> error
                isFiado && done.isNotEmpty() -> sync.createPosCredit(customerId, sum, dueDate) ?: "✔ Fiado registrado · ${Money.usd(sum)}"
                else -> "✔ Venta registrada · ${Money.usd(sum)}"
            }
            busy = false
        }
    }
}

/** Venta rápida: toca productos para añadirlos al carrito y cobra en un paso. */
@Composable
fun PosScreen(user: UserAccount, vm: PosViewModel = hiltViewModel()) {
    val products by vm.products.collectAsState()
    var q by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("TODAS") }
    var center by remember { mutableStateOf(SaleCenter.TIENDA) }
    var barcode by remember { mutableStateOf("") }
    var payment by remember { mutableStateOf("CONTADO") }
    var customerId by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("") }
    val customers = remember(products) { vm.customers() }
    val cats = remember(products) { listOf("TODAS") + products.map { it.category }.distinct().sorted() }
    val list = products.filter { it.stockActual > 0 && (cat == "TODAS" || it.category == cat) && (q.isBlank() || it.name.contains(q, true) || it.barcode.contains(q.trim(), true)) }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        Spacer(Modifier.height(8.dp))
        SearchField(q, { q = it }, "Buscar producto", Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.material3.OutlinedTextField(
                value = barcode, onValueChange = { barcode = it }, label = { Text("Código de barras") },
                singleLine = true, modifier = Modifier.weight(1f)
            )
            OutlinedButton(onClick = { vm.addByBarcode(barcode); barcode = "" }) { Text("Añadir") }
        }
        Text("Lector USB/Bluetooth: escribe el código y pulsa Añadir (o toca el producto).", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            cats.forEach { c -> FilterChip(selected = cat == c, onClick = { cat = c }, label = { Text(c) }) }
        }
        LazyVerticalGrid(GridCells.Adaptive(150.dp), Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(list, key = { it.id }) { p ->
                val inCart = vm.cart.firstOrNull { it.product.id == p.id }?.qty ?: 0
                Card(
                    Modifier.fillMaxWidth().clickable { vm.add(p) },
                    colors = if (inCart > 0) CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer) else CardDefaults.cardColors()
                ) {
                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CategoryThumb(p.category, 36.dp)
                            if (inCart > 0) Text("× $inCart", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Text(p.name, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodyMedium)
                        Text(Money.usd(p.precioVentaUsd), fontWeight = FontWeight.Bold)
                        Text("Stock ${Money.qty(p.stockActual)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Card(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                vm.cart.forEach { line ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${line.qty} × ${line.product.name}", Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(Money.usd(line.qty * line.product.precioVentaUsd))
                        TextButton(onClick = { vm.dec(line) }) { Text("−") }
                    }
                }
                ChipRow(
                    options = SaleCenter.entries.filter { it != SaleCenter.MOV },
                    selected = center,
                    label = { it.label },
                    onSelect = { center = it }
                )
                ChipRow(
                    options = listOf("CONTADO", "FIADO"),
                    selected = payment,
                    label = { if (it == "CONTADO") "Contado" else "Fiado" },
                    onSelect = { payment = it }
                )
                if (payment == "FIADO") {
                    if (customers.isEmpty()) {
                        Text("Sin clientes sincronizados: créelos en la Web.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    } else {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            customers.forEach { c -> FilterChip(selected = customerId == c.id, onClick = { customerId = c.id }, label = { Text(c.name) }) }
                        }
                        androidx.compose.material3.OutlinedTextField(dueDate, { dueDate = it }, label = { Text("Vence (AAAA-MM-DD, opcional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    }
                }
                vm.message?.let { Text(it, color = if (it.startsWith("✔")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (vm.cart.isNotEmpty()) OutlinedButton(onClick = { vm.cart.clear() }) { Text("Vaciar") }
                    Button(onClick = { vm.checkout(center, user, payment, customerId, dueDate) }, enabled = vm.cart.isNotEmpty() && !vm.busy, modifier = Modifier.weight(1f)) {
                        Text(if (vm.cart.isEmpty()) "Toca productos para vender" else (if (payment == "FIADO") "Fiar " else "Cobrar ") + Money.usd(vm.total))
                    }
                }
            }
        }
    }
}
