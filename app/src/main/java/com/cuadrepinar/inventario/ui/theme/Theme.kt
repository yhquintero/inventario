package com.cuadrepinar.inventario.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Typography

val Teal = Color(0xFF0F766E)
val TealDark = Color(0xFF5EEAD4)
val Gold = Color(0xFFB7791F)
val Paper = Color(0xFFF4F6F8)
val Ink = Color(0xFF0F172A)
val Forest = Color(0xFF0B1220)

private val LightColors = lightColorScheme(
    primary = Teal,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFCCFBF1),
    onPrimaryContainer = Color(0xFF062E2B),
    secondary = Gold,
    onSecondary = Color(0xFF2A2108),
    secondaryContainer = Color(0xFFFEF3C7),
    tertiary = Color(0xFF2563EB),
    background = Paper,
    onBackground = Ink,
    surface = Color(0xFFFFFFFF),
    onSurface = Ink,
    surfaceVariant = Color(0xFFE2E8F0),
    onSurfaceVariant = Color(0xFF64748B),
    error = Color(0xFFB3261E),
    outline = Color(0xFFCBD5E1)
)

private val DarkColors = darkColorScheme(
    primary = TealDark,
    onPrimary = Color(0xFF003731),
    primaryContainer = Color(0xFF0F6E66),
    onPrimaryContainer = Color(0xFFCFF7F0),
    secondary = Color(0xFFE7C27A),
    onSecondary = Color(0xFF2A2108),
    background = Forest,
    onBackground = Color(0xFFECFDF8),
    surface = Color(0xFF111A2B),
    onSurface = Color(0xFFECFDF8),
    surfaceVariant = Color(0xFF243330),
    onSurfaceVariant = Color(0xFFC5D5D1),
    error = Color(0xFFFFB4AB),
    outline = Color(0xFF8A9A96)
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
fun CuadrePinarTheme(
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
        typography = AppTypography,
        content = content
    )
}
