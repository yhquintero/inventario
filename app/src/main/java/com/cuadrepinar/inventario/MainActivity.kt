package com.cuadrepinar.inventario

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.fragment.app.FragmentActivity
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.cuadrepinar.inventario.ui.auth.AuthViewModel
import com.cuadrepinar.inventario.ui.auth.LoginScreen
import com.cuadrepinar.inventario.ui.license.LicenseScreen
import com.cuadrepinar.inventario.ui.license.LicenseViewModel
import com.cuadrepinar.inventario.ui.navigation.AppShell
import com.cuadrepinar.inventario.ui.theme.CuadrePinarTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
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
                                    theme = when (theme) {
                                        "light" -> "dark"
                                        "dark" -> "system"
                                        else -> "light"
                                    }
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
