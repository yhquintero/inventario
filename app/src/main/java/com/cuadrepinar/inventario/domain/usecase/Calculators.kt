package com.cuadrepinar.inventario.domain.usecase

import com.cuadrepinar.inventario.domain.model.CuadreTotals
import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.SaleCenter
import kotlin.math.abs

/**
 * Réplica exacta de las fórmulas de "Nuevo Cuadre Pinar.xlsx".
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
