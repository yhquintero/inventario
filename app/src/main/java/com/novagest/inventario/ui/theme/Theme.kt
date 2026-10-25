package com.novagest.inventario.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Typography

/* Paleta NovaGest: índigo profundo + esmeralda eléctrico + ámbar. */
val Indigo = Color(0xFF4F46E5)
val IndigoLight = Color(0xFF8B8BF5)
val Emerald = Color(0xFF059669)
val EmeraldLight = Color(0xFF34D399)
val Amber = Color(0xFFB45309)
val Paper = Color(0xFFF5F6FB)
val Ink = Color(0xFF101331)
val Night = Color(0xFF0A0E21)

private val LightColors = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4E4FD),
    onPrimaryContainer = Color(0xFF1E1B4B),
    secondary = Amber,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFEF3C7),
    onSecondaryContainer = Color(0xFF451A03),
    tertiary = Emerald,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF064E3B),
    background = Paper,
    onBackground = Ink,
    surface = Color(0xFFFFFFFF),
    onSurface = Ink,
    surfaceVariant = Color(0xFFE4E7F2),
    onSurfaceVariant = Color(0xFF5D6B8A),
    error = Color(0xFFB3261E),
    outline = Color(0xFFC7CBE3)
)

private val DarkColors = darkColorScheme(
    primary = IndigoLight,
    onPrimary = Color(0xFF1E1B4B),
    primaryContainer = Color(0xFF312E81),
    onPrimaryContainer = Color(0xFFE4E4FD),
    secondary = Color(0xFFFCD34D),
    onSecondary = Color(0xFF451A03),
    secondaryContainer = Color(0xFF3A2E12),
    onSecondaryContainer = Color(0xFFFEF3C7),
    tertiary = EmeraldLight,
    onTertiary = Color(0xFF064E3B),
    tertiaryContainer = Color(0xFF065F46),
    onTertiaryContainer = Color(0xFFD1FAE5),
    background = Night,
    onBackground = Color(0xFFE7EAF9),
    surface = Color(0xFF121732),
    onSurface = Color(0xFFE7EAF9),
    surfaceVariant = Color(0xFF262F56),
    onSurfaceVariant = Color(0xFF97A2C7),
    error = Color(0xFFFFB4AB),
    outline = Color(0xFF5A6493)
)

private val AppTypography = Typography(
    displaySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 32.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 24.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 20.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 16.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 14.sp)
)

@Composable
fun NovaGestTheme(
    themeMode: String = "system",
    content: @Composable () -> Unit
) {
    val dark = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        typography = AppTypography
    ) {
        // Surface: fija el fondo y el color de texto por defecto (LocalContentColor).
        // Sin ella, las pantallas que no viven dentro de un Scaffold — licencia y acceso —
        // dibujaban el texto en negro sobre el fondo oscuro.
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            content()
        }
    }
}
