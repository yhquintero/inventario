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
            val state by auth.state.collectAsState()
            var theme by remember { mutableStateOf("system") }
            CuadrePinarTheme(theme) {
                val user = state.user
                if (user == null) {
                    LoginScreen(auth) { }
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
