package com.novagest.keygen

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/* Misma paleta que la app NovaGest: índigo profundo + esmeralda. */
private val Indigo = Color(0xFF4F46E5)
private val IndigoLight = Color(0xFF8B8BF5)
private val Night = Color(0xFF0A0E21)

private val DarkColors = darkColorScheme(
    primary = IndigoLight,
    onPrimary = Color(0xFF1E1B4B),
    primaryContainer = Color(0xFF312E81),
    onPrimaryContainer = Color(0xFFE4E4FD),
    secondary = Color(0xFFFCD34D),
    onSecondary = Color(0xFF451A03),
    secondaryContainer = Color(0xFF3A2E12),
    onSecondaryContainer = Color(0xFFFEF3C7),
    tertiary = Color(0xFF34D399),
    background = Night,
    onBackground = Color(0xFFE7EAF9),
    surface = Color(0xFF121732),
    onSurface = Color(0xFFE7EAF9),
    surfaceVariant = Color(0xFF262F56),
    onSurfaceVariant = Color(0xFF97A2C7),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    outline = Color(0xFF5A6493)
)

private val LightColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4E4FD),
    onPrimaryContainer = Color(0xFF1E1B4B),
    secondary = Color(0xFFB45309),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFEF3C7),
    onSecondaryContainer = Color(0xFF451A03),
    tertiary = Color(0xFF059669),
    background = Color(0xFFF5F6FB),
    onBackground = Color(0xFF101331),
    surface = Color.White,
    onSurface = Color(0xFF101331),
    surfaceVariant = Color(0xFFE4E7F2),
    onSurfaceVariant = Color(0xFF5D6B8A),
    error = Color(0xFFB3261E),
    outline = Color(0xFFC7CBE3)
)

@Composable
fun KeygenTheme(
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(colorScheme = if (dark) DarkColors else LightColors) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            content()
        }
    }
}
