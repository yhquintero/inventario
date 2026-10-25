package com.novagest.inventario.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.novagest.inventario.security.BiometricHelper

/**
 * Pantalla que cubre la app cuando está activado «bloquear al abrir».
 *
 * Se muestra sólo con la sesión ya restaurada: si no hay sesión, lo que toca es el login.
 * «Entrar con contraseña» cierra la sesión guardada y lleva al acceso normal, para que nadie
 * se quede fuera si el sensor falla o se borran las huellas del teléfono.
 */
@Composable
fun LockScreen(
    onUnlocked: () -> Unit,
    onUsePassword: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val helper = remember { BiometricHelper(context) }
    var error by remember { mutableStateOf<String?>(null) }

    fun tryUnlock() {
        error = null
        if (activity == null) {
            error = "No se pudo abrir el sensor en esta pantalla."
            return
        }
        if (!helper.canAuthenticate()) {
            error = "Este teléfono no tiene huella ni rostro configurado."
            return
        }
        helper.prompt(
            activity,
            onSuccess = { onUnlocked() },
            onError = { error = it }
        )
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
        Text("NovaGest está bloqueada", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))
        Text(
            "Confirma tu huella o rostro para entrar.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = { tryUnlock() }, modifier = Modifier.fillMaxWidth()) {
            Text("Desbloquear")
        }
        Spacer(Modifier.height(4.dp))
        TextButton(onClick = onUsePassword) { Text("Entrar con contraseña") }
        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
        }
    }
}
