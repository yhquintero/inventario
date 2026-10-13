package com.novagest.inventario.ui.customers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.data.sync.SyncManager
import com.novagest.inventario.domain.model.Credit
import com.novagest.inventario.domain.model.Customer
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Clientes y fiados (NovaGest v1.0.0): lectura del estado compartido con la Web
 * y registro de abonos. El alta/edición completa de clientes vive en la Web;
 * aquí se consulta la deuda y se cobra sin crear tablas nuevas.
 */
@HiltViewModel
class CustomersViewModel @Inject constructor(private val sync: SyncManager) : ViewModel() {
    var customers by mutableStateOf<List<Customer>>(emptyList())
    var credits by mutableStateOf<List<Credit>>(emptyList())
    var message by mutableStateOf<String?>(null)

    init { reload() }

    fun reload() {
        customers = sync.customers()
        credits = sync.credits()
    }

    fun balance(customerId: String): Double = credits.filter { it.customerId == customerId }.sumOf { it.pending }
    val totalReceivable: Double get() = credits.sumOf { it.pending }

    fun pay(credit: Credit, amount: Double, method: String) {
        viewModelScope.launch {
            message = sync.addCreditPayment(credit.id, amount, method) ?: "✔ Abono registrado"
            reload()
        }
    }
}

@Composable
fun CustomersScreen(user: UserAccount, vm: CustomersViewModel = hiltViewModel()) {
    var paying by remember { mutableStateOf<Credit?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Clientes y fiados", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Por cobrar: ${Money.usd(vm.totalReceivable)} · ${vm.customers.size} clientes · ${vm.credits.count { it.pending > 0 }} fiados abiertos",
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        vm.message?.let { Text(it, color = if (it.startsWith("✔")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) }
        Spacer(Modifier.height(10.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(vm.customers, key = { it.id }) { c ->
                val balance = vm.balance(c.id)
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Row(Modifier.fillMaxWidth()) {
                            Text(c.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            Text(if (balance > 0) Money.usd(balance) else "Al día", color = if (balance > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                        }
                        if (c.phone.isNotBlank()) Text("☎ ${c.phone}", style = MaterialTheme.typography.bodySmall)
                        if (c.creditLimitUsd > 0) Text("Límite ${Money.usd(c.creditLimitUsd)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        vm.credits.filter { it.customerId == c.id }.forEach { cr ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    "${cr.date} · ${cr.concept.ifBlank { "Fiado" }} · ${cr.status} · pendiente ${Money.usd(cr.pending)}",
                                    style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f)
                                )
                                if (cr.pending > 0) TextButton(onClick = { paying = cr }) { Text("Abonar") }
                            }
                        }
                    }
                }
            }
            if (vm.customers.isEmpty()) {
                item { Text("Aún no hay clientes. Créelos desde la Web en «Clientes y fiados».", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
    paying?.let { credit ->
        var amount by remember { mutableStateOf(credit.pending.toString()) }
        var method by remember { mutableStateOf("EFECTIVO") }
        AlertDialog(
            onDismissRequest = { paying = null },
            title = { Text("Abonar fiado") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${credit.customerName} · pendiente ${Money.usd(credit.pending)}")
                    OutlinedTextField(amount, { amount = it }, label = { Text("Abono (USD)") }, singleLine = true)
                    OutlinedTextField(method, { method = it }, label = { Text("Método") }, singleLine = true)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    vm.pay(credit, amount.toDoubleOrNull() ?: 0.0, method.ifBlank { "EFECTIVO" })
                    paying = null
                }) { Text("Registrar abono") }
            },
            dismissButton = { TextButton(onClick = { paying = null }) { Text("Cancelar") } }
        )
    }
}
