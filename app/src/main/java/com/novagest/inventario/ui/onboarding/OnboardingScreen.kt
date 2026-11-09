package com.novagest.inventario.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.PointOfSale
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.novagest.inventario.ui.theme.nebulaIsDark

private data class Page(
    val icon: ImageVector,
    val title: String,
    val body: String,
    val footnote: String
)

private val pages = listOf(
    Page(
        Icons.Outlined.PointOfSale,
        "Vende en segundos",
        "Toca productos, cobra contado o a fiado e imprime el ticket en tu impresora Bluetooth.",
        "Vender es el corazón de NovaGest"
    ),
    Page(
        Icons.Outlined.Inventory2,
        "Inventario vivo",
        "Cada venta descuenta el stock al instante. Recibe avisos cuando algo está por agotarse.",
        "Sin cuadernos ni descuadres"
    ),
    Page(
        Icons.Outlined.ReceiptLong,
        "Cierra la caja sin estrés",
        "Cuadre diario, reportes con gráficas y exportación a Excel y PDF: el negocio, de un vistazo.",
        "Tu contador te lo agradecerá"
    )
)

/** Bienvenida Nebula: tres pantallas, una sola vez, antes de entrar. */
@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    var page by androidx.compose.runtime.remember { mutableStateOf(0) }
    val dark = nebulaIsDark()
    val bg = if (dark)
        Brush.verticalGradient(listOf(Color(0xFF0B0824), Color(0xFF0E1330), Color(0xFF071E2A)), startY = 0f, endY = Float.POSITIVE_INFINITY)
    else
        Brush.verticalGradient(listOf(Color(0xFFEFEEFF), Color(0xFFF4F6FF), Color(0xFFE8FAFF)))
    val glow = if (dark) Color(0x3322D3EE) else Color(0x33574BE0)
    val accent = if (dark) Color(0xFF8F86FF) else Color(0xFF574BE0)
    val textPrimary = if (dark) Color(0xFFE9ECFB) else Color(0xFF141A3D)
    val textMuted = if (dark) Color(0xFFA6AFD8) else Color(0xFF4E5878)
    val current = pages[page]

    Box(
        Modifier
            .fillMaxSize()
            .background(bg)
    ) {
        // Halos de luz decorativos (futurista)
        Box(
            Modifier
                .size(340.dp)
                .align(Alignment.TopEnd)
                .padding(top = 40.dp, end = (-110).dp)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(glow, Color.Transparent), center = Offset(170f, 170f), radius = 260f))
        )
        Box(
            Modifier
                .size(280.dp)
                .align(Alignment.BottomStart)
                .padding(bottom = 130.dp, start = (-90).dp)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(Color(0x33A78BFA), Color.Transparent), center = Offset(140f, 140f), radius = 220f))
        )

        Column(
            Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp, vertical = 20.dp)
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "NovaGest",
                    color = textPrimary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.6.sp,
                    fontSize = 15.sp
                )
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onDone) { Text("Saltar", color = textMuted) }
            }

            Spacer(Modifier.height(18.dp))

            // Marca / monograma
            Text(
                "N",
                fontSize = 64.sp,
                fontWeight = FontWeight.Black,
                style = MaterialTheme.typography.displaySmall.copy(
                    brush = Brush.linearGradient(listOf(accent, Color(0xFF22D3EE)))
                )
            )
            Text(
                "GESTIONA · CRECE · AVANZA",
                color = if (dark) Color(0xFF22D3EE) else Color(0xFF0E7490),
                style = MaterialTheme.typography.labelSmall
            )

            Spacer(Modifier.weight(1f))

            AnimatedContent(
                targetState = page,
                transitionSpec = {
                    (slideInHorizontally { it / 3 } + fadeIn()) togetherWith (slideOutHorizontally { -it / 3 } + fadeOut())
                },
                label = "onboardingPage"
            ) { p ->
                val item = pages[p]
                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Box(
                        Modifier
                            .size(96.dp)
                            .clip(RoundedCornerShape(26.dp))
                            .background(Brush.linearGradient(listOf(accent.copy(alpha = 0.28f), Color(0xFF22D3EE).copy(alpha = 0.14f)))),
                        contentAlignment = Alignment.Center
                    ) {
                        androidx.compose.material3.Icon(
                            item.icon,
                            contentDescription = null,
                            tint = if (dark) Color(0xFF9BEFF9) else Color(0xFF4338CA),
                            modifier = Modifier.size(46.dp)
                        )
                    }
                    Text(
                        item.title,
                        color = textPrimary,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.SemiBold,
                        lineHeight = 36.sp
                    )
                    Text(
                        item.body,
                        color = textMuted,
                        fontSize = 15.sp,
                        lineHeight = 23.sp
                    )
                    Text(
                        item.footnote.uppercase(),
                        color = accent,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            // Puntos + acción principal
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    pages.indices.forEach { i ->
                        Box(
                            Modifier
                                .size(if (i == page) 22.dp else 8.dp, 8.dp)
                                .clip(RoundedCornerShape(99.dp))
                                .background(if (i == page) accent else accent.copy(alpha = 0.3f))
                        )
                    }
                }
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = {
                        if (page < pages.lastIndex) page += 1 else onDone()
                    },
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        if (page < pages.lastIndex) "Siguiente" else "Empezar",
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "1 de ${pages.size} · puedes revisar esto en Ajustes cuando quieras",
                color = textMuted,
                style = MaterialTheme.typography.labelSmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
