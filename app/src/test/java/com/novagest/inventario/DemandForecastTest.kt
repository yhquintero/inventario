package com.novagest.inventario

import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.SaleCenter
import com.novagest.inventario.domain.usecase.DemandForecast
import com.novagest.inventario.ui.reports.HeatmapModel
import com.novagest.inventario.util.Dates
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class DemandForecastTest {

    @Test
    fun ritmoMedioYCompraSugerida() {
        val avg = DemandForecast.averageDaily(60.0, 30)
        assertEquals(2.0, avg, 1e-9)
        // 14 días de cobertura: 28 uds.; hay 5 → comprar 23
        assertEquals(23.0, DemandForecast.suggestedPurchase(avg, 14, 5.0), 1e-9)
        // Existencia suficiente → no comprar
        assertEquals(0.0, DemandForecast.suggestedPurchase(avg, 14, 100.0), 1e-9)
    }

    @Test
    fun diasDeStockSinVentasEsInfinito() {
        assertTrue(DemandForecast.daysOfStock(10.0, 0.0).isInfinite())
        assertEquals(5.0, DemandForecast.daysOfStock(10.0, 2.0), 1e-9)
    }

    @Test
    fun sugerenciaNuncaEsNegativa() {
        assertEquals(0.0, DemandForecast.suggestedPurchase(-1.0, 14, 0.0), 1e-9)
        assertEquals(0.0, DemandForecast.suggestedPurchase(2.0, 0, 0.0), 1e-9)
    }

    private fun movimiento(fecha: LocalDate, importe: Double, tipo: MovementType = MovementType.VENTA) =
        Movement(
            dateEpoch = Dates.startOfDay(fecha),
            weekday = "",
            productId = 1L,
            type = tipo,
            quantity = 1.0,
            unitPriceUsd = importe,
            importeUsd = importe,
            center = SaleCenter.TIENDA,
            comisionCup = 0.0,
            stockInicial = 0.0,
            stockFinal = 0.0,
            userId = 1L
        )

    @Test
    fun mapaDeCalorNivelesYExtremos() {
        assertEquals(0, HeatmapModel.level(0.0, 100.0))
        assertEquals(1, HeatmapModel.level(20.0, 100.0))
        assertEquals(2, HeatmapModel.level(45.0, 100.0))
        assertEquals(3, HeatmapModel.level(60.0, 100.0))
        assertEquals(4, HeatmapModel.level(90.0, 100.0))
        assertEquals(0, HeatmapModel.level(10.0, 0.0))
    }

    @Test
    fun mapaDeCalorCubreTodasLasCeldas() {
        val hoy = LocalDate.of(2026, 11, 9)
        val movimientos = listOf(
            movimiento(hoy.minusDays(2), 50.0),
            movimiento(hoy.minusDays(2), 50.0),
            movimiento(hoy.minusDays(30), 25.0)
        )
        val grid = HeatmapModel.grid(movimientos, hoy, weeks = 10)
        assertEquals(7, grid.size)
        grid.forEach { assertEquals(10, it.cells.size) }
        // El día con 100.0 debe quedar en el nivel más alto (es el máximo).
        val mejor = grid.flatMap { it.cells }.maxByOrNull { it.sales }
        assertEquals(100.0, mejor?.sales ?: -1.0, 1e-9)
        assertEquals(4, mejor?.level)
        // Ninguna celda futura cuenta ventas.
        grid.flatMap { it.cells }.filter { it.future }.forEach { assertEquals(0.0, it.sales, 1e-9) }
    }
}
