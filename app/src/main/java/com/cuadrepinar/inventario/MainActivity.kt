package com.cuadrepinar.inventario

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
import com.cuadrepinar.inventario.data.repository.SettingsRepository
import com.cuadrepinar.inventario.ui.auth.AuthViewModel
import com.cuadrepinar.inventario.ui.auth.LoginScreen
import com.cuadrepinar.inventario.ui.license.LicenseScreen
import com.cuadrepinar.inventario.ui.license.LicenseViewModel
import com.cuadrepinar.inventario.ui.navigation.AppShell
import com.cuadrepinar.inventario.ui.theme.CuadrePinarTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val auth: AuthViewModel = hiltViewModel()
            val licenseVm: LicenseViewModel = hiltViewModel()
            val authState by auth.state.collectAsState()
            val licenseState by licenseVm.state.collectAsState()
            var theme by remember { mutableStateOf("system") }
            var licenseOk by remember { mutableStateOf(false) }

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

            CuadrePinarTheme(theme) {
                // LICENCIA DE USO: verificación obligatoria siempre primero
                if (!licenseOk && licenseState.status?.valid != true) {
                    LicenseScreen(licenseVm) {
                        licenseOk = true
                    }
                } else {
                    val user = authState.user
                    if (user == null) {
                        LoginScreen(auth) { }
                    } else {
                        // Verificación periódica de licencia también dentro de AppShell
                        // Si la licencia expira durante uso, se fuerza logout
                        if (licenseState.status?.valid == false) {
                            licenseOk = false
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
}
