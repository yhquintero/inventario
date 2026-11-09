package com.novagest.inventario.domain.usecase

import kotlin.math.ceil
import kotlin.math.max

/**
 * Predicción de demanda sencilla (media móvil × existencia), sin servidores ni IA externa:
 *   ritmo diario   = unidades vendidas en la ventana / días de la ventana
 *   días de stock  = existencia actual / ritmo diario
 *   compra sugerida = ritmo × cobertura − existencia (nunca negativa)
 *
 * Las mismas fórmulas que usa la Web (`js/forecast.js`), verificables con pruebas unitarias.
 */
object DemandForecast {

    /** Ritmo medio de venta por día en la ventana. 0 si no hubo ventas. */
    fun averageDaily(totalUnits: Double, windowDays: Int): Double =
        if (windowDays <= 0) 0.0 else totalUnits / windowDays

    /**
     * Días que aguantará la existencia al ritmo actual.
     * Sin ventas recientes devuelve infinito (no urgente).
     */
    fun daysOfStock(stock: Double, avgDaily: Double): Double =
        if (avgDaily <= 0.0) Double.POSITIVE_INFINITY else stock / avgDaily

    /** Unidades sugeridas para cubrir [coverageDays] días a partir de hoy. */
    fun suggestedPurchase(avgDaily: Double, coverageDays: Int, stock: Double): Double {
        if (avgDaily <= 0.0 || coverageDays <= 0) return 0.0
        return max(0.0, ceil(avgDaily * coverageDays - stock))
    }

    /** Urgencia para ordenar las reposiciones: menos días restantes = más urgente. */
    fun urgency(stock: Double, avgDaily: Double): Double =
        daysOfStock(stock, avgDaily)
}
