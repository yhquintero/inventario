package com.novagest.inventario.domain.usecase

import com.novagest.inventario.domain.model.CuadreTotals
import com.novagest.inventario.domain.model.DailyCuadre
import com.novagest.inventario.domain.model.Movement
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.SaleCenter
import kotlin.math.abs

/**
 * Réplica exacta de las fórmulas del libro diario NovaGest.
 *
 * STOCK FINAL (columna I, hojas diarias):
 *   SI ENTRADA → stockInicial + cantidad
 *   SI VENTA o SALIDA → stockInicial - cantidad
 *
 * IMPORTE (columna F):
 *   precioVenta * cantidad   (solo si el movimiento es VENTA; si no, 0)
 *
 * COMISION CUP (columna H):
 *   comisionUnitaria * cantidad   (solo si el centro es GESTOR; si no, 0)
 *
 * STOCK CALCULADO (COMPROBACION!F):
 *   stockInicial - ventas + entradas - salidas
 *
 * Panel financiero (columnas N–S):
 *   cobrosUsd = USD + ZELLE + MXN/tipoMxn + CUP_EFECTIVO/tipoCup + CUP_TRANSF/tipoCup + EUROPA
 *   entradaDineroUsd = USD + CUP/tipoCup
 *   extraccionUsd = USD + CUP/tipoCup
 *   TOTAL GENERAL = cobros + extraccion - entradaDinero     (P16 = P9 + P13 - P10)
 *   diferenciaUsd = VENTA TOTAL - TOTAL GENERAL             (R16 = P2 - P16)
 *   diferenciaMn  = diferenciaUsd * CUP/USD                 (S16)
 *   FONDO FINAL CUP = inicial - domicilio - otros - comisiones - cambio
 */
object StockCalculator {

    fun stockFinal(stockInicial: Double, type: MovementType, quantity: Double): Double =
        when (type) {
            MovementType.ENTRADA -> stockInicial + quantity
            MovementType.VENTA, MovementType.SALIDA -> stockInicial - quantity
        }

    fun importeUsd(type: MovementType, quantity: Double, unitPriceUsd: Double): Double =
        if (type == MovementType.VENTA) round2(quantity * unitPriceUsd) else 0.0

    fun comisionCup(center: SaleCenter, quantity: Double, unitCommissionCup: Double): Double =
        if (center == SaleCenter.GESTOR) round2(quantity * unitCommissionCup) else 0.0

    /** NovaGest SEPT.xlsx: IMP COMISION = (VENTA 1 + VENTA 2) × COMISION, en toda venta. */
    fun comisionVenta(type: MovementType, quantity: Double, unitCommissionCup: Double): Double =
        if (type == MovementType.VENTA) round2(quantity * unitCommissionCup) else 0.0

    /**
     * Cuadre de la hoja diaria (filas 230–254). Todo en USD; los valores CUP se dividen por la tasa.
     * CUADRE = (VENTA + FONDOS − GASTOS) − SALIDAS − CAPITAL − X COBRAR  → debe quedar en 0.
     */
    fun cuadreSept(
        venta: Double, rate: Double, fondoCup: Double, fondoUsd: Double,
        comisionesCup: Double, domiciliosCup: Double, gastosCup: Double,
        salidasUsd: Double, usdEfectivo: Double, zelle: Double, mnCup: Double, xCobrar: Double = 0.0
    ): Double {
        val r = if (rate > 0) rate else 1.0
        val total = venta + fondoCup / r + fondoUsd
        val gastos = (comisionesCup + domiciliosCup + gastosCup) / r
        val capital = usdEfectivo + zelle + mnCup / r
        return round2(total - gastos - salidasUsd - capital - xCobrar)
    }

    fun stockCalculado(stockInicial: Double, ventas: Double, entradas: Double, salidas: Double): Double =
        stockInicial - ventas + entradas - salidas

    fun wouldGoNegative(stockInicial: Double, type: MovementType, quantity: Double): Boolean =
        stockFinal(stockInicial, type, quantity) < -1e-9

    fun validateQuantity(quantity: Double): String? {
        if (quantity.isNaN() || quantity <= 0.0) return "La cantidad debe ser mayor que cero."
        return null
    }

    fun round2(value: Double): Double = kotlin.math.round(value * 100.0) / 100.0
}

object CuadreCalculator {

    fun totals(cuadre: DailyCuadre, dayMovements: List<Movement>): CuadreTotals {
        val ventaTotal = StockCalculator.round2(
            dayMovements.filter { it.type == MovementType.VENTA }.sumOf { it.importeUsd }
        )
        val comisionesMov = StockCalculator.round2(dayMovements.sumOf { it.comisionCup })
        val cup = safeRate(cuadre.cupUsd)
        val mxn = safeRate(cuadre.mxnUsd)

        val cobrosUsd = StockCalculator.round2(
            cuadre.cobroUsd +
                cuadre.cobroZelle +
                (cuadre.cobroMxn / mxn) +
                (cuadre.cobroCupEfectivo / cup) +
                (cuadre.cobroCupTransf / cup) +
                cuadre.cobroEuropa
        )
        val entradaDineroUsd = StockCalculator.round2(
            cuadre.entradaUsd + cuadre.entradaCup / cup
        )
        val extraccionTotalUsd = StockCalculator.round2(
            cuadre.extraccionUsd + cuadre.extraccionCup / cup
        )
        // Excel: P16 = P9 + P13 - P10
        val totalGeneral = StockCalculator.round2(cobrosUsd + extraccionTotalUsd - entradaDineroUsd)
        val diferenciaUsd = StockCalculator.round2(ventaTotal - totalGeneral)
        val diferenciaMn = StockCalculator.round2(diferenciaUsd * cup)
        val fondoFinalCup = StockCalculator.round2(
            cuadre.fondoInicialCup - cuadre.domicilioCup - cuadre.otrosGastosCup -
                cuadre.comisionesCup - cuadre.cambioCup
        )
        val fondoFinalUsd = StockCalculator.round2(
            cuadre.fondoInicialUsd - cuadre.domicilioUsd - cuadre.otrosGastosUsd -
                cuadre.comisionesUsd - cuadre.cambioUsd
        )
        return CuadreTotals(
            ventaTotal = ventaTotal,
            cobrosUsd = cobrosUsd,
            entradaDineroUsd = entradaDineroUsd,
            extraccionTotalUsd = extraccionTotalUsd,
            totalGeneral = totalGeneral,
            diferenciaUsd = diferenciaUsd,
            diferenciaMn = diferenciaMn,
            fondoFinalCup = fondoFinalCup,
            fondoFinalUsd = fondoFinalUsd,
            comisionesMovimientos = comisionesMov
        )
    }

    private fun safeRate(rate: Double): Double = if (rate <= 0.0) 1.0 else rate

    fun isBalanced(totals: CuadreTotals, epsilon: Double = 0.05): Boolean =
        abs(totals.diferenciaUsd) <= epsilon
}

/**
 * Fichas de Costo e IPV: espejo de web/js/ipv.js y de las funciones del
 * repositorio IPV · Fichas y Costos (_create_ficha, _validate_control,
 * yield_info, servings_from_stock). Dinero redondeado a 2 decimales.
 */
object IpvCalculator {

    fun itemSubtotal(quantity: Double, unitCost: Double): Double = StockCalculator.round2(quantity * unitCost)

    fun fichaTotal(items: List<com.novagest.inventario.domain.model.FichaItem>): Double =
        StockCalculator.round2(items.sumOf { it.subtotal })

    fun costPerServing(totalCost: Double, yieldQty: Double): Double {
        val y = if (yieldQty > 0) yieldQty else 1.0
        return StockCalculator.round2(totalCost / y)
    }

    data class Servings(val servings: Int, val limitedBy: String?, val shortages: List<String>)

    /** Raciones que permite el stock actual: manda el insumo más escaso. */
    fun servingsFromStock(
        items: List<com.novagest.inventario.domain.model.FichaItem>,
        yieldQty: Double,
        stockOf: (String) -> Double
    ): Servings {
        val y = if (yieldQty > 0) yieldQty else 1.0
        var best: Int? = null
        var limitedBy: String? = null
        val shortages = mutableListOf<String>()
        for (item in items) {
            val pid = item.materialId ?: continue
            val per = item.quantity / y
            if (per <= 0) continue
            val stock = stockOf(pid)
            val possible = kotlin.math.floor(stock / per).toInt()
            if (best == null || possible < best!!) { best = possible; limitedBy = item.description }
            if (stock < per) shortages += item.description
        }
        return Servings(best ?: 0, limitedBy, shortages)
    }

    fun nextVersion(versions: List<Int>): Int = (versions.maxOrNull() ?: 0) + 1

    /** Código correlativo IPV-AAAA-NNNN por año del período «AAAA-MM». */
    fun nextControlCode(existingCodes: List<String>, period: String): String {
        val year = period.take(4).ifBlank { "0000" }
        val prefix = "IPV-$year-"
        val max = existingCodes.filter { it.startsWith(prefix) }
            .mapNotNull { it.removePrefix(prefix).toIntOrNull() }.maxOrNull() ?: 0
        return prefix + (max + 1).toString().padStart(4, '0')
    }

    data class ControlValidation(val status: String, val checkedTotal: Double, val messages: List<String>)

    /** Réplica de _validate_control del repo IPV: sumas y ficha aprobada. */
    fun validateControl(fichaStatus: String?, fichaTotalCost: Double?, snapshotTotal: Double, items: List<com.novagest.inventario.domain.model.FichaItem>): ControlValidation {
        val messages = mutableListOf<String>()
        if (fichaStatus == null || fichaTotalCost == null) {
            return ControlValidation("Con diferencias", 0.0, listOf("La ficha vinculada no existe."))
        }
        if (fichaStatus != "Aprobada") messages += "La Ficha de Costo vinculada no está aprobada."
        if (items.isEmpty()) messages += "El control no contiene líneas de detalle."
        var sum = 0.0
        for (item in items) {
            sum += item.subtotal
            if (item.description.isBlank()) messages += "Existe una línea sin descripción."
            if (item.quantity <= 0) messages += "Cantidad no válida en: ${item.description}."
        }
        val checked = StockCalculator.round2(sum)
        if (checked != StockCalculator.round2(snapshotTotal)) messages += "La suma de las líneas no coincide con el total registrado en el control."
        if (StockCalculator.round2(snapshotTotal) != StockCalculator.round2(fichaTotalCost)) messages += "El total del control no coincide con el total de la ficha vinculada."
        return if (messages.isEmpty()) {
            ControlValidation("Validado", checked, listOf("El total y las líneas coinciden con la Ficha de Costo vinculada."))
        } else {
            ControlValidation("Con diferencias", checked, messages)
        }
    }
}

object Validators {
    fun productName(name: String): String? {
        val n = name.trim()
        if (n.isEmpty()) return "El nombre del producto es obligatorio."
        if (n.length < 2) return "El nombre es demasiado corto."
        return null
    }

    fun nonNegative(value: Double, field: String): String? {
        if (value.isNaN() || value < 0.0) return "$field no puede ser negativo."
        return null
    }

    fun username(value: String): String? {
        val v = value.trim()
        if (v.length < 3) return "El usuario debe tener al menos 3 caracteres."
        if (!v.matches(Regex("^[a-zA-Z0-9._-]+$"))) return "Usuario inválido."
        return null
    }

    fun password(value: String): String? {
        if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres."
        if (!value.any { it.isDigit() }) return "La contraseña debe incluir un número."
        if (!value.any { it.isUpperCase() }) return "La contraseña debe incluir una mayúscula."
        return null
    }

    fun email(value: String): String? {
        if (value.isBlank()) return null
        if (!value.contains("@") || !value.contains(".")) return "Correo inválido."
        return null
    }
}
