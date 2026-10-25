package com.novagest.keygen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.ContentPaste
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.VpnKey
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Switch
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.net.URLEncoder

class MainActivity : androidx.fragment.app.FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KeygenTheme {
                KeygenRoot()
            }
        }
    }
}

/** Estado del formulario, fuera de las pestañas para no perder lo escrito al cambiar de una a otra. */
private class GeneratorState {
    var client by mutableStateOf("")
    var product by mutableStateOf("NovaGest")
    var termIndex by mutableIntStateOf(2)          // "1 mes"
    var type by mutableStateOf("FULL")
    var users by mutableStateOf("20")
    var devices by mutableStateOf("10")
    var features by mutableStateOf("*")
    var result by mutableStateOf<GeneratedKey?>(null)
}

private data class GeneratedKey(val key: String, val payload: LicensePayload, val term: LicenseTerm)

private data class VerifyResult(val ok: Boolean, val message: String, val payload: LicensePayload?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KeygenRoot() {
    val context = LocalContext.current
    val secretStore = remember { SecretStore(context) }
    val historyStore = remember { HistoryStore(context) }
    val lockPrefs = remember { LockPrefs(context) }

    // Bloqueo opcional: si está activo, no se llega ni al formulario sin la huella.
    var locked by remember { mutableStateOf(lockPrefs.enabled) }
    if (locked) {
        KeygenLockScreen { locked = false }
        return
    }

    var secret by remember { mutableStateOf(secretStore.load()) }
    var tab by remember { mutableIntStateOf(0) }
    var showSecretDialog by remember { mutableStateOf(false) }
    var showSecurityDialog by remember { mutableStateOf(false) }
    var pendingSecret by remember { mutableStateOf<String?>(null) }
    var historyVersion by remember { mutableIntStateOf(0) }

    val gen = remember { GeneratorState() }
    val history = remember(historyVersion) { historyStore.all() }

    val currentSecret = secret
    if (currentSecret == null) {
        SecretSetupScreen { raw ->
            val bytes = runCatching { LicenseKeyEngine.secretBytes(raw) }.getOrNull()
            when {
                bytes == null -> "No se pudo leer el secreto."
                bytes.size != 32 -> "El secreto debe dar 32 bytes al decodificarse (44 caracteres en base64url)."
                else -> {
                    secretStore.save(raw)
                    secret = raw
                    null
                }
            }
        }
        return
    }

    val secretBytes = remember(currentSecret) { LicenseKeyEngine.secretBytes(currentSecret) }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Keygen") },
                    actions = {
                        IconButton(onClick = { showSecurityDialog = true }) {
                            Icon(Icons.Outlined.Lock, "Seguridad")
                        }
                        IconButton(onClick = { showSecretDialog = true }) {
                            Icon(Icons.Outlined.Key, "Cambiar secreto")
                        }
                    }
                )
                TabRow(selectedTabIndex = tab) {
                    listOf("Generar", "Verificar", "Historial").forEachIndexed { index, title ->
                        Tab(
                            selected = tab == index,
                            onClick = { tab = index },
                            text = { Text(title) }
                        )
                    }
                }
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().imePadding()) {
            when (tab) {
                0 -> GeneratorTab(gen, secretBytes) { generated ->
                    gen.result = generated
                    historyStore.add(
                        HistoryItem(
                            at = generated.payload.issuedAt,
                            client = generated.payload.clientName,
                            type = generated.payload.type,
                            expiresAt = generated.payload.expiresAt,
                            key = generated.key
                        )
                    )
                    historyVersion++
                }
                1 -> VerifyTab(secretBytes)
                else -> HistoryTab(
                    records = history,
                    onClear = {
                        historyStore.clear()
                        historyVersion++
                    },
                    onDelete = { key ->
                        historyStore.remove(key)
                        historyVersion++
                    }
                )
            }
        }
    }

    if (showSecretDialog) {
        var text by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showSecretDialog = false },
            title = { Text("Cambiar secreto") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Pega el contenido de data/license.key del servidor para el que quieras emitir claves.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        label = { Text("Secreto") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val bytes = runCatching { LicenseKeyEngine.secretBytes(text) }.getOrNull()
                        if (bytes?.size == 32) {
                            // No se guarda aquí: cambiar el secreto deja sin validez las claves
                            // ya emitidas, así que se pide una confirmación explícita.
                            pendingSecret = text.trim()
                        } else {
                            Toast.makeText(context, "El secreto debe dar 32 bytes", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = text.isNotBlank()
                ) { Text("Guardar") }
            },
            dismissButton = {
                TextButton(onClick = { showSecretDialog = false }) { Text("Cancelar") }
            }
        )
    }

    pendingSecret?.let { nuevo ->
        AlertDialog(
            onDismissRequest = { pendingSecret = null },
            title = { Text("¿Cambiar el secreto?") },
            text = {
                Text(
                    "Las claves que ya emitiste con el secreto anterior dejarán de validar en el servidor. " +
                        "Hazlo solo si también cambiaste data/license.key y vas a reemitir las licencias."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    secretStore.save(nuevo)
                    secret = nuevo
                    pendingSecret = null
                    showSecretDialog = false
                }) { Text("Cambiar") }
            },
            dismissButton = {
                TextButton(onClick = { pendingSecret = null }) { Text("Cancelar") }
            }
        )
    }

    if (showSecurityDialog) {
        val gate = remember { BiometricGate(context) }
        val canBiometric = remember { gate.canAuthenticate() }
        var lockOn by remember { mutableStateOf(lockPrefs.enabled) }
        // Huella del secreto: permite saber cuál está cargado sin mostrarlo.
        val fingerprint = remember(secretBytes) {
            java.security.MessageDigest.getInstance("SHA-256").digest(secretBytes)
                .take(4).joinToString("") { "%02X".format(it.toInt() and 0xFF) }
        }
        val version = remember {
            runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }
                .getOrNull() ?: "—"
        }
        AlertDialog(
            onDismissRequest = { showSecurityDialog = false },
            title = { Text("Seguridad") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Bloquear al abrir")
                            Text(
                                if (canBiometric) {
                                    "Pide huella o rostro al abrir la app. Se aplica la próxima vez que entres."
                                } else {
                                    "Este teléfono no tiene huella ni rostro configurado."
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(checked = lockOn, onCheckedChange = { lockOn = it }, enabled = canBiometric)
                    }
                    Text(
                        "Secreto cargado: ${secretBytes.size} bytes · huella $fingerprint",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        "Versión $version",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    lockPrefs.enabled = lockOn
                    showSecurityDialog = false
                }) { Text("Guardar") }
            },
            dismissButton = {
                TextButton(onClick = { showSecurityDialog = false }) { Text("Cerrar") }
            }
        )
    }
}

/** Pantalla de bloqueo del keygen, con la huella del teléfono. */
@Composable
private fun KeygenLockScreen(onUnlocked: () -> Unit) {
    val context = LocalContext.current
    val activity = context as? androidx.fragment.app.FragmentActivity
    val gate = remember { BiometricGate(context) }
    val lockPrefs = remember { LockPrefs(context) }
    var error by remember { mutableStateOf<String?>(null) }

    fun tryUnlock() {
        error = null
        if (activity == null) {
            error = "No se pudo abrir el sensor en esta pantalla."
            return
        }
        if (!gate.canAuthenticate()) {
            error = "Este teléfono no tiene huella ni rostro configurado."
            return
        }
        gate.prompt(activity, onSuccess = { onUnlocked() }, onError = { error = it })
    }

    LaunchedEffect(Unit) { tryUnlock() }

    Column(
        Modifier.fillMaxSize().safeDrawingPadding().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Outlined.Lock,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(72.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text("Keygen bloqueado", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))
        Text(
            "Confirma tu huella o rostro para emitir licencias.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = { tryUnlock() }, modifier = Modifier.fillMaxWidth()) {
            Text("Desbloquear")
        }
        // Si el teléfono se quedó sin huellas configuradas, el bloqueo no se puede cumplir:
        // se ofrece quitarlo (hace falta tener el teléfono en la mano, que ya era el supuesto).
        if (!gate.canAuthenticate()) {
            Spacer(Modifier.height(4.dp))
            TextButton(onClick = {
                lockPrefs.enabled = false
                onUnlocked()
            }) { Text("Quitar el bloqueo") }
        }
        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun SecretSetupScreen(onSave: (String) -> String?) {
    var text by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            Icons.Outlined.VpnKey,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(48.dp)
        )
        Text("Configurar el secreto de firma", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Esta herramienta emite licencias de NovaGest. Para firmarlas necesita el mismo secreto que usa el servidor.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("¿Dónde está?", style = MaterialTheme.typography.titleSmall)
                Text(
                    "En el equipo donde corre el servidor, en data/license.key. Es una cadena de 44 caracteres que suele terminar en «=». Se pega aquí una sola vez.",
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Se guarda cifrado en este teléfono con una clave del Keystore y nunca se envía a ninguna parte.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        OutlinedTextField(
            value = text,
            onValueChange = { text = it; error = null },
            label = { Text("Secreto (data/license.key)") },
            minLines = 3,
            modifier = Modifier.fillMaxWidth()
        )
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = { error = onSave(text) },
            enabled = text.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) { Text("Guardar y empezar") }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GeneratorTab(
    gen: GeneratorState,
    secret: ByteArray,
    onGenerate: (GeneratedKey) -> Unit
) {
    val context = LocalContext.current

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Emitir licencia", style = MaterialTheme.typography.titleLarge)
        Text(
            "La clave se firma aquí mismo con el secreto del servidor. El cliente la pega en «Licencia de uso → Activar licencia».",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // El cliente pide la licencia por WhatsApp; con el mensaje copiado se rellenan
        // cliente y plazo sin teclear nada (lo mismo que hace license_studio.py en la Web).
        OutlinedButton(
            onClick = {
                val clip = context.getSystemService(ClipboardManager::class.java)
                    ?.primaryClip?.getItemAt(0)?.text?.toString()
                val parsed = parseLicenseRequest(clip)
                if (parsed == null) {
                    Toast.makeText(
                        context,
                        "Copia primero el mensaje de solicitud que te envió el cliente.",
                        Toast.LENGTH_LONG
                    ).show()
                } else {
                    parsed.client?.let { gen.client = it }
                    parsed.termLabel?.let { label ->
                        val index = LicenseKeyEngine.TERMS.indexOfFirst {
                            it.label.equals(label, ignoreCase = true) ||
                                it.label.startsWith(label, ignoreCase = true) ||
                                label.startsWith(it.label, ignoreCase = true)
                        }
                        if (index >= 0) {
                            gen.termIndex = index
                            gen.type = LicenseKeyEngine.TERMS[index].type
                        }
                    }
                    Toast.makeText(
                        context,
                        "Solicitud leída: ${parsed.client ?: "sin nombre"} · ${parsed.termLabel ?: "sin plazo"}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Outlined.ContentPaste, null, Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text("Pegar solicitud de WhatsApp")
        }

        OutlinedTextField(
            value = gen.client,
            onValueChange = { gen.client = it },
            label = { Text("Cliente o empresa") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = gen.product,
            onValueChange = { gen.product = it },
            label = { Text("Producto") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Text("Plazo", style = MaterialTheme.typography.titleSmall)
        ChipFlow(
            options = LicenseKeyEngine.TERMS.map { it.label },
            selected = gen.termIndex,
            onSelect = { index ->
                gen.termIndex = index
                gen.type = LicenseKeyEngine.TERMS[index].type
            }
        )

        Text("Tipo", style = MaterialTheme.typography.titleSmall)
        ChipFlow(
            options = LicenseKeyEngine.TYPES,
            selected = LicenseKeyEngine.TYPES.indexOf(gen.type),
            onSelect = { gen.type = LicenseKeyEngine.TYPES[it] }
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = gen.users,
                onValueChange = { gen.users = it.filter(Char::isDigit) },
                label = { Text("Máx. usuarios") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = gen.devices,
                onValueChange = { gen.devices = it.filter(Char::isDigit) },
                label = { Text("Máx. equipos") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f)
            )
        }
        OutlinedTextField(
            value = gen.features,
            onValueChange = { gen.features = it },
            label = { Text("Funciones (* = todas)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = {
                val term = LicenseKeyEngine.TERMS[gen.termIndex]
                val payload = LicenseKeyEngine.newPayload(
                    clientName = gen.client,
                    product = gen.product,
                    term = term,
                    type = gen.type,
                    maxUsers = gen.users.toIntOrNull() ?: 20,
                    maxDevices = gen.devices.toIntOrNull() ?: 10,
                    features = gen.features.split(',').map { it.trim() }.filter { it.isNotEmpty() }
                        .ifEmpty { listOf("*") }
                )
                onGenerate(GeneratedKey(LicenseKeyEngine.createKey(payload, secret), payload, term))
            },
            enabled = gen.client.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) { Text("Generar clave") }

        gen.result?.let { result ->
            GeneratedCard(result) { key -> copyToClipboard(context, key) }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun GeneratedCard(result: GeneratedKey, onCopy: (String) -> Unit) {
    val context = LocalContext.current

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.width(8.dp))
                Text("Clave lista", style = MaterialTheme.typography.titleMedium)
            }
            Text(
                "${result.payload.clientName} · ${result.term.label} · ${result.payload.type}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                "Vence: ${result.payload.expiresText()}  ·  ID ${result.payload.licenseId}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                SelectionContainer {
                    Text(
                        result.key,
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { onCopy(result.key) }, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.ContentCopy, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Copiar")
                }
                OutlinedButton(onClick = { shareKey(context, result.key) }, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.Share, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Compartir")
                }
            }
            Button(onClick = { sendWhatsApp(context, result) }, modifier = Modifier.fillMaxWidth()) {
                Text("Enviar por WhatsApp")
            }
        }
    }
}

@Composable
private fun VerifyTab(secret: ByteArray) {
    var input by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<VerifyResult?>(null) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Verificar una clave", style = MaterialTheme.typography.titleLarge)
        Text(
            "Comprueba la firma y la vigencia sin conexión, antes de entregarla o si el cliente dice que no le funciona.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedTextField(
            value = input,
            onValueChange = { input = it; result = null },
            label = { Text("Clave (NG-...)") },
            minLines = 4,
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = {
                result = LicenseKeyEngine.verify(input, secret).fold(
                    onSuccess = { payload ->
                        val left = payload.daysLeft()
                        if (!payload.isPermanent && left < 0) {
                            VerifyResult(false, "La clave está vencida (${payload.expiresText()}).", payload)
                        } else {
                            VerifyResult(true, "Firma correcta.", payload)
                        }
                    },
                    onFailure = { VerifyResult(false, it.message ?: "Clave no válida.", null) }
                )
            },
            enabled = input.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) { Text("Verificar") }

        result?.let { r ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (r.ok) Icons.Outlined.CheckCircle else Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = if (r.ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            r.message,
                            style = MaterialTheme.typography.titleSmall,
                            color = if (r.ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                    }
                    r.payload?.let { p ->
                        Text("Cliente: ${p.clientName}", style = MaterialTheme.typography.bodyMedium)
                        Text("Producto: ${p.product}", style = MaterialTheme.typography.bodySmall)
                        Text(
                            "Tipo: ${p.type} · Vence: ${p.expiresText()}",
                            style = MaterialTheme.typography.bodySmall
                        )
                        if (!p.isPermanent) {
                            Text("Días restantes: ${p.daysLeft()}", style = MaterialTheme.typography.bodySmall)
                        }
                        Text(
                            "ID: ${p.licenseId} · Usuarios: ${p.maxUsers} · Equipos: ${p.maxDevices}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun HistoryTab(records: List<HistoryItem>, onClear: () -> Unit, onDelete: (String) -> Unit) {
    val context = LocalContext.current

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Claves emitidas", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            if (records.isNotEmpty()) {
                TextButton(onClick = { shareHistoryCsv(context, records) }) { Text("CSV") }
                IconButton(onClick = onClear) { Icon(Icons.Outlined.Delete, "Borrar historial") }
            }
        }
        if (records.isEmpty()) {
            Text(
                "Todavía no has generado ninguna clave en este teléfono.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 24.dp)
            )
        } else {
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(records) { item ->
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(item.client, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    "${item.type} · vence ${item.expiresText()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    item.key.take(30) + "…",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            IconButton(onClick = { copyToClipboard(context, item.key) }) {
                                Icon(Icons.Outlined.ContentCopy, "Copiar")
                            }
                            IconButton(onClick = { onDelete(item.key) }) {
                                Icon(Icons.Outlined.Delete, "Borrar esta clave")
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChipFlow(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        options.forEachIndexed { index, label ->
            FilterChip(
                selected = index == selected,
                onClick = { onSelect(index) },
                label = { Text(label) }
            )
        }
    }
}

// ------------------------------------------------------------------ utilidades

private fun copyToClipboard(context: Context, text: String) {
    val manager = context.getSystemService(ClipboardManager::class.java)
    manager.setPrimaryClip(ClipData.newPlainText("Clave de licencia", text))
    Toast.makeText(context, "Clave copiada", Toast.LENGTH_SHORT).show()
}

private fun shareKey(context: Context, key: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, key)
    }
    context.startActivity(Intent.createChooser(intent, "Compartir clave"))
}

/** Historial completo en CSV para llevarlo a una hoja de cálculo o al correo. */
private fun shareHistoryCsv(context: Context, records: List<HistoryItem>) {
    val fecha = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
    fun celda(valor: String) = "\"" + valor.replace("\"", "\"\"") + "\""
    val lineas = buildList {
        add(listOf("fecha", "cliente", "tipo", "vence", "clave").joinToString(","))
        records.forEach { r ->
            add(
                listOf(
                    fecha.format(java.util.Date(r.at * 1000)),
                    r.client,
                    r.type,
                    r.expiresText(),
                    r.key
                ).joinToString(",") { celda(it) }
            )
        }
    }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_SUBJECT, "Licencias NovaGest")
        putExtra(Intent.EXTRA_TEXT, lineas.joinToString("\n"))
    }
    context.startActivity(Intent.createChooser(intent, "Compartir historial"))
}

private fun sendWhatsApp(context: Context, result: GeneratedKey) {
    val message = LicenseKeyEngine.whatsappMessage(result.key, result.payload, result.term)
    val encoded = URLEncoder.encode(message, "UTF-8")
    val uri = Uri.parse("https://wa.me/?text=$encoded")
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        .onFailure { Toast.makeText(context, "No se pudo abrir WhatsApp", Toast.LENGTH_SHORT).show() }
}
