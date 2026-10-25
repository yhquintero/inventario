package com.novagest.inventario

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.lifecycleScope
import com.novagest.inventario.data.repository.SettingsRepository
import com.novagest.inventario.ui.auth.AuthViewModel
import com.novagest.inventario.ui.auth.LoginScreen
import com.novagest.inventario.ui.license.LicenseScreen
import com.novagest.inventario.ui.license.LicenseViewModel
import com.novagest.inventario.ui.navigation.AppShell
import com.novagest.inventario.ui.theme.NovaGestTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    @Inject
    lateinit var appLock: com.novagest.inventario.security.AppLock

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AskNotificationPermissionOnce()
            val auth: AuthViewModel = hiltViewModel()
            val licenseVm: LicenseViewModel = hiltViewModel()
            val authState by auth.state.collectAsState()
            val licenseState by licenseVm.state.collectAsState()
            var theme by remember { mutableStateOf("system") }
            var licenseOk by remember { mutableStateOf(false) }
            // Bloqueo al abrir: si está activo, la sesión restaurada pide huella antes de entrar.
            var unlocked by remember { mutableStateOf(!appLock.enabled) }

            // El tema elegido se guarda en los ajustes y sobrevive al reinicio de la app:
            // se lee de la base de datos al abrir y se aplica al instante si cambia.
            LaunchedEffect(Unit) {
                settingsRepository.observe().collect { settings ->
                    if (settings != null) theme = settings.theme
                }
            }

            val applyTheme: (String) -> Unit = { next ->
                theme = next
                lifecycleScope.launch {
                    settingsRepository.save(settingsRepository.get().copy(theme = next))
                }
            }

            // Si hay licencia válida en caché y es permanente o no expiró, permite pasar rápido
            // Pero siempre se verifica contra servidor en el ViewModel

            NovaGestTheme(theme) {
                // LICENCIA DE USO: verificación obligatoria siempre primero
                if (!licenseOk && licenseState.status?.valid != true) {
                    LicenseScreen(licenseVm) {
                        licenseOk = true
                    }
                } else {
                    val user = authState.user
                    if (user == null) {
                        // Al entrar con usuario y contraseña ya está autenticado: no se le
                        // vuelve a pedir la huella en la misma sesión.
                        LoginScreen(auth) { unlocked = true }
                    } else if (licenseState.status?.valid == false) {
                        licenseOk = false
                    } else if (!unlocked) {
                        com.novagest.inventario.ui.auth.LockScreen(
                            onUnlocked = { unlocked = true },
                            onUsePassword = {
                                unlocked = true
                                auth.logout()
                            }
                        )
                    } else {
                        AppShell(
                            user = user,
                            themeMode = theme,
                            onToggleTheme = {
                                applyTheme(
                                    when (theme) {
                                        "light" -> "dark"
                                        "dark" -> "system"
                                        else -> "light"
                                    }
                                )
                            },
                            onLogout = { auth.logout() }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Android 13+ exige pedir el permiso de notificaciones en ejecución. Sin esto la app
 * declaraba POST_NOTIFICATIONS pero nunca lo solicitaba, así que el aviso de la copia
 * de seguridad diaria no llegaba a mostrarse nunca.
 */
@androidx.compose.runtime.Composable
private fun AskNotificationPermissionOnce() {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU) return
    val context = androidx.compose.ui.platform.LocalContext.current
    val launcher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { /* si lo deniega, la app sigue funcionando; se puede cambiar en Ajustes del sistema */ }
    LaunchedEffect(Unit) {
        val granted = androidx.core.content.ContextCompat.checkSelfPermission(
            context, android.Manifest.permission.POST_NOTIFICATIONS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!granted) launcher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
    }
}
