package com.novagest.inventario.ui.movements

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.novagest.inventario.data.printer.ReceiptImage
import com.novagest.inventario.data.printer.ReceiptShare
import com.novagest.inventario.domain.model.Customer
import com.novagest.inventario.domain.model.Movement

/**
 * A-19 · Compartir el ticket por WhatsApp.
 *
 * Muestra **cómo va a quedar el mensaje** antes de enviarlo, deja elegir el cliente (para
 * que el texto lleve su **saldo pendiente**) y ofrece tres salidas: imagen + texto por el
 * selector del sistema, solo texto por WhatsApp o copiar el texto.
 *
 * La imagen la dibuja [ReceiptImage] con el mismo contenido que el ticket impreso, así que
 * el cliente recibe algo que se lee igual en papel y en el móvil.
 */
@Composable
fun ShareReceiptDialog(
    movement: Movement,
    vm: MovementViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val customers = vm.customers
    var selected by remember { mutableStateOf<Customer?>(null) }
    var expanded by remember { mutableStateOf(false) }
    var payload by remember { mutableStateOf<ReceiptShare.SharePayload?>(null) }

    val aviso: (String) -> Unit = { texto ->
        Toast.makeText(context, texto, Toast.LENGTH_SHORT).show()
    }

    // La lista de fiados puede haber cambiado desde que se abrió Movimientos.
    LaunchedEffect(Unit) { runCatching { vm.reloadCustomers() } }

    LaunchedEffect(movement, selected) {
        payload = runCatching { vm.prepareShare(movement, selected) }.getOrNull()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Compartir el ticket") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Se envía la imagen del ticket y, debajo, este texto. Si elige un cliente, " +
                        "el mensaje lleva su saldo pendiente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Box {
                    OutlinedButton(onClick = { expanded = true }) {
                        Text(selected?.name?.let { "Cliente: $it" } ?: "Sin cliente")
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        DropdownMenuItem(
                            text = { Text("Sin cliente") },
                            onClick = { selected = null; expanded = false }
                        )
                        customers.forEach { c ->
                            DropdownMenuItem(
                                text = { Text(c.name) },
                                onClick = { selected = c; expanded = false }
                            )
                        }
                    }
                }
                Text(
                    payload?.text ?: "Preparando el ticket…",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 220.dp)
                        .verticalScroll(rememberScrollState())
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = payload != null,
                onClick = {
                    val p = payload
                    if (p == null) {
                        aviso("Todavía no está listo el ticket.")
                    } else {
                        runCatching { ReceiptImage.share(context, p) }
                            .onFailure { aviso("No se pudo abrir el selector de aplicaciones.") }
                        onDismiss()
                    }
                }
            ) { Text("📤 Imagen + texto") }
        },
        dismissButton = {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                TextButton(
                    enabled = payload != null,
                    onClick = {
                        payload?.let {
                            runCatching { ReceiptImage.shareText(context, it) }
                                .onFailure { aviso("No se pudo abrir WhatsApp.") }
                        }
                    }
                ) { Text("WhatsApp (texto)") }
                TextButton(
                    enabled = payload != null,
                    onClick = {
                        payload?.let { p ->
                            val clip = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clip.setPrimaryClip(ClipData.newPlainText("Ticket NovaGest", p.text))
                            aviso("Texto del ticket copiado")
                        }
                    }
                ) { Text("Copiar texto") }
                TextButton(onClick = onDismiss) { Text("Cerrar") }
            }
        }
    )
}
