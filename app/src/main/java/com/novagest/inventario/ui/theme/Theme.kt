package com.novagest.inventario.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Typography

/* ═══════════════════════════════════════════════════════════════════
   NovaGest NEBULA — la paleta futurista de la app
   Violeta eléctrico + cian neón + esmeralda, sobre índigo noche.
   Pensada para gráficos, KPIs y superficies con elevación tonal.
   ═══════════════════════════════════════════════════════════════════ */

// Marca — acento (el «violeta Nebula»)
val Violet = Color(0xFF574BE0)
val VioletDeep = Color(0xFF4338CA)
val VioletNeon = Color(0xFF8F86FF)
val VioletGlow = Color(0xFFB7B2FF)

// Acento — cian neón (gráficos, anillos, barras)
val CyanDeep = Color(0xFF0E7490)
val Cyan = Color(0xFF0891B2)
val CyanNeon = Color(0xFF22D3EE)
val CyanGlow = Color(0xFF9BEFF9)

// Acento — esmeralda (éxito, entradas, cobrar)
val EmeraldDeep = Color(0xFF059669)
val EmeraldNeon = Color(0xFF2FE6A8)
val MintGlow = Color(0xFF8FF5C8)

// Acento — ámbar/oro (advertencias y metas)
val GoldDeep = Color(0xFFB45309)
val GoldNeon = Color(0xFFF5C15C)
val Amber = Color(0xFFB45309)
val AmberLight = Color(0xFFFCD34D)

// Compatibilidad: los tokens históricos siguen exportados.
val Indigo = Violet
val IndigoLight = VioletNeon
val Emerald = EmeraldDeep
val EmeraldLight = EmeraldNeon
val Paper = Color(0xFFF4F6FF)
val Ink = Color(0xFF141A3D)
val Night = Color(0xFF070A1A)

// Superficies oscuras Nebula
val SurfaceNight = Color(0xFF0E1330)
val SurfaceRaised = Color(0xFF161D40)
val SurfaceOverlay = Color(0xFF1C2347)
val OutlineNight = Color(0xFF38416F)

private val LightColors = lightColorScheme(
    primary = Violet,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE9E8FF),
    onPrimaryContainer = Color(0xFF24205E),
    secondary = Cyan,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD9F6FE),
    onSecondaryContainer = Color(0xFF083344),
    tertiary = EmeraldDeep,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD2FBE8),
    onTertiaryContainer = Color(0xFF053426),
    background = Paper,
    onBackground = Ink,
    surface = Color(0xFFFFFFFF),
    onSurface = Ink,
    surfaceVariant = Color(0xFFE9ECFB),
    onSurfaceVariant = Color(0xFF4E5878),
    error = Color(0xFFB3261E),
    onError = Color.White,
    errorContainer = Color(0xFFFDE2E1),
    onErrorContainer = Color(0xFF410E0B),
    outline = Color(0xFFC9CCE8),
    outlineVariant = Color(0xFFE2E5F6)
)

private val DarkColors = darkColorScheme(
    primary = VioletNeon,
    onPrimary = Color(0xFF201E57),
    primaryContainer = Color(0xFF2E2A63),
    onPrimaryContainer = Color(0xFFE7E6FF),
    secondary = CyanNeon,
    onSecondary = Color(0xFF05333D),
    secondaryContainer = Color(0xFF0F3448),
    onSecondaryContainer = Color(0xFFCFF6FF),
    tertiary = EmeraldNeon,
    onTertiary = Color(0xFF04241A),
    tertiaryContainer = Color(0xFF0C3B2B),
    onTertiaryContainer = Color(0xFFCFFCE7),
    background = Night,
    onBackground = Color(0xFFE9ECFB),
    surface = SurfaceNight,
    onSurface = Color(0xFFE9ECFB),
    surfaceVariant = SurfaceOverlay,
    onSurfaceVariant = Color(0xFFA6AFD8),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF4B1C19),
    onErrorContainer = Color(0xFFFFDAD6),
    outline = OutlineNight,
    outlineVariant = Color(0xFF232B52)
)

private val AppTypography = Typography(
    displaySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, letterSpacing = (-0.25).sp),
    headlineSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 20.sp, letterSpacing = 0.15.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 16.sp, letterSpacing = 0.15.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.2.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 14.sp, letterSpacing = 0.4.sp),
    labelSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.5.sp)
)

/** ¿Está el tema activo en oscuro? (independiente del modo claro del sistema). */
@Composable
fun nebulaIsDark(): Boolean = MaterialTheme.colorScheme.background.luminance() < 0.30f

/** Degradado de marca Nebula (violeta → cian): acentos, títulos, anillos. */
@Composable
fun nebulaBrandBrush(horizontal: Boolean = true): Brush {
    val dark = nebulaIsDark()
    val stops = if (dark)
        listOf(VioletNeon, CyanNeon)
    else
        listOf(VioletDeep, Cyan)
    return if (horizontal) Brush.linearGradient(stops) else Brush.verticalGradient(stops)
}

/** Colores ordenados para gráficos (barras, anillos, heatmap), alto contraste en ambos temas. */
@Composable
fun nebulaChartColors(): List<Color> =
    if (nebulaIsDark()) listOf(CyanNeon, VioletNeon, EmeraldNeon, GoldNeon)
    else listOf(Violet, Cyan, EmeraldDeep, GoldDeep)

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
