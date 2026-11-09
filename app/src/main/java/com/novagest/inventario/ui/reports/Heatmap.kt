package com.novagest.inventario.ui.reports

import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.util.Dates
import java.time.LocalDate

/** Una fila del mapa de calor: un día de la semana y sus celdas (una por semana). */
data class HeatRow(
    val label: String,
    val cells: List<HeatCell>
)

data class HeatCell(
    val date: LocalDate,
    val sales: Double,
    val level: Int,
    val future: Boolean,
    val contentDescription: String
)

/**
 * Mapa de calor de ventas para Android — misma lógica que la Web (`js/charts.js`):
 * cuadrícula de 7 filas (lunes…domingo) × N semanas terminando hoy.
 * Escala 0–4 por umbrales sobre el máximo de la ventana (0 = sin ventas).
 */
object HeatmapModel {
    private val labels = listOf("L", "M", "X", "J", "V", "S", "D")

    fun grid(movements: List<Movement>, endDate: LocalDate = LocalDate.now(), weeks: Int = 10): List<HeatRow> {
        val w = weeks.coerceIn(1, 26)
        // Lunes de la primera semana visible.
        val thisMonday = endDate.minusDays(((endDate.dayOfWeek.value + 6) % 7).toLong())
        val start = thisMonday.minusWeeks((w - 1).toLong())

        val salesByDate: Map<LocalDate, Double> = movements
            .filter { it.type == MovementType.VENTA }
            .groupBy { Dates.toLocalDate(it.dateEpoch) }
            .mapValues { (_, list) -> list.sumOf { m -> m.importeUsd } }

        val max = salesByDate.values.maxOrNull() ?: 0.0

        val cellsByWeekday: List<List<HeatCell>> = (0 until 7).map { weekday ->
            (0 until w).map { col ->
                val date = start.plusDays((col * 7 + weekday).toLong())
                val future = date.isAfter(endDate)
                val sales = if (future) 0.0 else (salesByDate[date] ?: 0.0)
                val cd = if (future) "$date: aún no ocurre" else "$date: ${"%.2f".format(sales)} USD en ventas"
                HeatCell(date, sales, level(sales, max), future, cd)
            }
        }
        return labels.mapIndexed { i, label -> HeatRow(label, cellsByWeekday[i]) }
    }

    /** Nivel 0–4 por fracción del máximo (igual que `heatLevel` de la Web). */
    fun level(value: Double, max: Double): Int {
        if (max <= 0.0 || value <= 0.0) return 0
        val f = value / max
        return when {
            f <= 0.25 -> 1
            f <= 0.50 -> 2
            f <= 0.75 -> 3
            else -> 4
        }
    }
}
