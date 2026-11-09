package com.novagest.inventario.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.novagest.inventario.ui.theme.nebulaChartColors
import com.novagest.inventario.ui.theme.nebulaIsDark

/* ═══════════════════════════════════════════════════════════════════
   Gráficos Nebula — la cara futurista de los datos en el móvil.
   Todos usan la paleta de `ui.theme.Theme` (violeta → cian neón) y se
   adaptan solos al tema claro/oscuro. Sin dependencias externas.
   ═══════════════════════════════════════════════════════════════════ */

/** Barras con degradado vertical, brillo superior y rejilla punteada. */
@Composable
fun GradientBarChart(
    values: List<Pair<String, Float>>,
    modifier: Modifier = Modifier,
    showValues: Boolean = true
) {
    val colors = nebulaChartColors()
    val gridColor = MaterialTheme.colorScheme.surfaceVariant
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val max = values.maxOfOrNull { it.second }?.takeIf { it > 0f } ?: 1f
    var ready by remember { mutableStateOf(false) }
    val anim by animateFloatAsState(
        targetValue = if (ready) 1f else 0f,
        animationSpec = tween(650, easing = FastOutSlowInEasing),
        label = "nebulaBars"
    )
    LaunchedEffect(Unit) { ready = true }

    Column(modifier.fillMaxWidth()) {
        Canvas(Modifier.fillMaxWidth().height(150.dp)) {
            if (values.isEmpty()) return@Canvas
            val dash = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
            val plotH = size.height * 0.82f
            listOf(0.34f, 0.67f, 1f).forEach { f ->
                val gy = size.height - plotH * f
                drawLine(gridColor, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1f, pathEffect = dash)
            }
            val slot = size.width / values.size
            val barW = (slot * 0.52f).coerceAtMost(72f)
            values.forEachIndexed { i, (_, v) ->
                val h = ((v / max) * plotH * anim).coerceAtLeast(2f)
                val x = i * slot + (slot - barW) / 2f
                val top = size.height - h
                val c = colors[i % colors.size]
                drawRoundRect(
                    brush = Brush.verticalGradient(listOf(c, c.copy(alpha = 0.45f)), startY = top, endY = size.height),
                    topLeft = Offset(x, top),
                    size = Size(barW, h),
                    cornerRadius = CornerRadius(barW / 2.6f, barW / 2.6f)
                )
                // Reflejo neón en el borde superior.
                drawRoundRect(
                    color = c,
                    topLeft = Offset(x, top),
                    size = Size(barW, (barW / 2.6f).coerceAtMost(h)),
                    cornerRadius = CornerRadius(barW / 2.6f, barW / 2.6f),
                    alpha = 0.95f
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            values.forEach { (label, v) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelLarge)
                    if (showValues) {
                        Text(formatCompact(v), style = MaterialTheme.typography.labelSmall, color = labelColor)
                    }
                }
            }
        }
    }
}

/** Anillo (donut) Nebula con leyenda y porcentaje por segmento. */
@Composable
fun DonutChart(
    values: List<Pair<String, Float>>,
    modifier: Modifier = Modifier,
    centerValue: String = "",
    centerLabel: String = ""
) {
    val colors = nebulaChartColors()
    val track = MaterialTheme.colorScheme.surfaceVariant
    val total = values.sumOf { it.second.toDouble() }.toFloat()
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(146.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                val stroke = 24.dp.toPx()
                if (total <= 0f) {
                    drawArc(color = track, startAngle = 0f, sweepAngle = 360f, useCenter = false, style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke))
                    return@Canvas
                }
                var startAngle = -90f
                values.forEachIndexed { i, (_, v) ->
                    val sweep = (v / total) * 360f
                    if (sweep <= 0.5f) return@forEachIndexed
                    val c = colors[i % colors.size]
                    drawArc(
                        color = c,
                        startAngle = startAngle + 1.4f,
                        sweepAngle = (sweep - 2.8f).coerceAtLeast(0.5f),
                        useCenter = false,
                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke, cap = StrokeCap.Round)
                    )
                    startAngle += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(centerValue, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                if (centerLabel.isNotBlank()) {
                    Text(centerLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            values.forEachIndexed { i, (label, v) ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.size(12.dp).background(colors[i % colors.size], RoundedCornerShape(4.dp)))
                    Text(label, Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    val pct = if (total > 0f) (v / total) * 100f else 0f
                    Text(
                        "${String.format("%.0f", pct)}%",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/** Curva suave de ventas con relleno degradado y glow doble. */
@Composable
fun SalesLineChart(
    values: List<Float>,
    labels: List<String>,
    modifier: Modifier = Modifier,
    stroke: Color = MaterialTheme.colorScheme.secondary
) {
    val dark = nebulaIsDark()
    val gridColor = MaterialTheme.colorScheme.surfaceVariant
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val fillTop = stroke.copy(alpha = if (dark) 0.36f else 0.28f)

    Column(modifier.fillMaxWidth()) {
        Canvas(Modifier.fillMaxWidth().height(150.dp)) {
            if (values.isEmpty()) return@Canvas
            val max = (values.maxOrNull() ?: 0f).takeIf { it > 0f } ?: 1f
            val padX = 6f
            val topPad = 16f
            val base = size.height
            val dash = PathEffect.dashPathEffect(floatArrayOf(9f, 9f))
            listOf(0.36f, 0.68f, 1f).forEach { f ->
                val gy = base - (base - topPad) * f
                drawLine(gridColor, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1f, pathEffect = dash)
            }
            fun px(i: Int) = padX + i * (size.width - 2 * padX) / (values.size - 1).coerceAtLeast(1)
            fun py(v: Float) = base - (v / max) * (base - topPad) * 0.92f
            val points = values.mapIndexed { i, v -> Offset(px(i), py(v)) }
            val line = smoothPath(points)
            val area = Path().apply {
                addPath(line)
                lineTo(points.last().x, base)
                lineTo(points.first().x, base)
                close()
            }
            drawPath(area, Brush.verticalGradient(listOf(fillTop, Color.Transparent), startY = 0f, endY = base))
            drawPath(line, stroke.copy(alpha = 0.14f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 10f, cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawPath(line, stroke.copy(alpha = 0.34f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 5f, cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawPath(line, stroke, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawCircle(stroke.copy(alpha = 0.25f), radius = 8f, center = points.last())
            drawCircle(stroke, radius = 3.2.dp.toPx(), center = points.last())
        }
        val stride = ((labels.size - 1) / 4).coerceAtLeast(1)
        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            labels.indices
                .filter { it % stride == 0 || it == labels.lastIndex }
                .take(5)
                .forEach { Text(labels[it], style = MaterialTheme.typography.labelSmall, color = labelColor) }
        }
    }
}

/** Mini curva sin ejes para tarjetas compactas (p. ej. tipo de cambio). */
@Composable
fun Sparkline(
    values: List<Float>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.secondary
) {
    Canvas(modifier.fillMaxWidth().height(44.dp)) {
        if (values.size < 2) return@Canvas
        val max = values.maxOrNull() ?: 1f
        val min = values.minOrNull() ?: 0f
        val span = (max - min).takeIf { it > 0f } ?: 1f
        val points = values.mapIndexed { i, v ->
            Offset(i * size.width / (values.size - 1), size.height - ((v - min) / span) * (size.height - 6f) - 3f)
        }
        val line = smoothPath(points)
        drawPath(line, color.copy(alpha = 0.18f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 7f, cap = StrokeCap.Round, join = StrokeJoin.Round))
        drawPath(line, color, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.8.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

/** Celda del mapa de calor de ventas. */
data class HeatCellUi(val dateLabel: String, val contentDescription: String, val level: Int, val future: Boolean)

/** Mapa de calor de ventas: 7 filas (lunes…domingo) × N semanas de columnas neón. */
@Composable
fun HeatmapCalendar(
    rows: List<Pair<String, List<HeatCellUi>>>,
    modifier: Modifier = Modifier
) {
    val dark = nebulaIsDark()
    val empty = MaterialTheme.colorScheme.surfaceVariant
    val ramp = if (dark)
        listOf(empty, Color(0xFF173E4E), Color(0xFF0E5E74), Color(0xFF0E94B4), Color(0xFF22D3EE))
    else
        listOf(empty, Color(0xFFE4E2FF), Color(0xFFC2BCFB), Color(0xFF8F86FF), Color(0xFF574BE0))
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val cell = 22.dp
    val gap = 4.dp

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(gap)) {
        rows.forEach { (dayLabel, cells) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(gap)) {
                Text(dayLabel, modifier = Modifier.width(22.dp), style = MaterialTheme.typography.labelSmall, color = labelColor)
                cells.forEach { c ->
                    val level = c.level.coerceIn(0, 4)
                    Box(
                        Modifier
                            .size(cell)
                            .semantics { contentDescription = c.contentDescription }
                            .background(if (c.future) Color.Transparent else ramp[level], RoundedCornerShape(5.dp))
                    )
                }
            }
        }
        Spacer(Modifier.height(2.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Menos", style = MaterialTheme.typography.labelSmall, color = labelColor)
            ramp.forEach { c -> Box(Modifier.size(13.dp).background(c, RoundedCornerShape(4.dp))) }
            Text("Más", style = MaterialTheme.typography.labelSmall, color = labelColor)
        }
    }
}

/** Barra de progreso con degradado Nebula (stock, metas, carga suave). */
@Composable
fun GradientLinearProgress(
    progress: Float,
    modifier: Modifier = Modifier,
    start: Color? = null,
    end: Color? = null
) {
    val s = start ?: MaterialTheme.colorScheme.primary
    val e = end ?: MaterialTheme.colorScheme.secondary
    val track = MaterialTheme.colorScheme.surfaceVariant
    Canvas(modifier.fillMaxWidth().height(6.dp)) {
        val h = size.height
        val r = CornerRadius(h / 2f, h / 2f)
        drawRoundRect(track, cornerRadius = r)
        val w = size.width * progress.coerceIn(0f, 1f)
        if (w > 0.5f) {
            drawRoundRect(
                brush = Brush.horizontalGradient(listOf(s, e), startX = 0f, endX = w),
                size = Size(w, h),
                cornerRadius = r
            )
        }
    }
}

/** Formato compacto para el eje de valores de las barras. */
private fun formatCompact(v: Float): String = when {
    v >= 1_000_000f -> String.format("%.1fM", v / 1_000_000f)
    v >= 10_000f -> String.format("%.1fk", v / 1_000f)
    v >= 1_000f -> String.format("%.0f", v)
    v == v.toLong().toFloat() -> v.toLong().toString()
    else -> String.format("%.1f", v)
}

/** Curva suave (tangente horizontal) usada por los gráficos de línea. */
private fun smoothPath(points: List<Offset>): Path {
    val path = Path()
    if (points.isEmpty()) return path
    path.moveTo(points.first().x, points.first().y)
    for (i in 1 until points.size) {
        val prev = points[i - 1]
        val curr = points[i]
        val midX = (prev.x + curr.x) / 2f
        path.cubicTo(midX, prev.y, midX, curr.y, curr.x, curr.y)
    }
    return path
}
