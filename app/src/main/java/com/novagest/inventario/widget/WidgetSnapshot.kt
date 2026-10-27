package com.novagest.inventario.widget

import com.novagest.inventario.data.local.entity.MovementEntity
import com.novagest.inventario.data.local.entity.ProductEntity
import com.novagest.inventario.util.Money
import java.time.LocalDate
import java.time.ZoneId

/**
 * A-04 · Datos del widget de inicio.
 *
 * El widget no puede consultar la base de datos mientras se dibuja (Android lo corta a los
 * pocos segundos), así que la app calcula este resumen y lo deja guardado. Aquí solo hay
 * cálculo y texto: no depende de Android y se puede probar sin teléfono.
 */
data class WidgetData(
    val businessName: String = "NovaGest",
    val ventasHoyUsd: Double = 0.0,
    val unidadesHoy: Double = 0.0,
    val ventasMesUsd: Double = 0.0,
    val stockBajo: Int = 0,
    val agotados: Int = 0,
    val productoCritico: String = "",
    val actualizado: String = ""
) {
    /** Cifra grande del widget: la venta de hoy. */
    val ventaHoy: String get() = Money.usd(ventasHoyUsd)

    /** Segunda línea: cuántas unidades salieron hoy. */
    val detalleHoy: String get() = "${Money.qty(unidadesHoy)} unidad(es) · mes ${Money.usd(ventasMesUsd)}"

    /** Aviso de existencias, en una línea y en lenguaje claro. */
    val existencias: String
        get() = when {
            agotados > 0 && stockBajo > 0 -> "$agotados agotado(s) · $stockBajo en el mínimo"
            agotados > 0 -> "$agotados agotado(s): repón hoy"
            stockBajo > 0 -> "$stockBajo en el mínimo"
            else -> "Existencias al día"
        }

    val hayAlerta: Boolean get() = agotados > 0 || stockBajo > 0

    /** Qué reponer primero (el producto con menos existencia y más rotación). */
    val critico: String get() = if (productoCritico.isBlank()) "" else "Reponer: $productoCritico"

    val pie: String get() = if (actualizado.isBlank()) "Abre NovaGest para actualizar" else "Actualizado $actualizado"
}

object WidgetSnapshot {

    /**
     * Resumen a partir de lo que ya hay en el teléfono.
     *
     * @param today día que se está viendo (por defecto, hoy)
     * @param zone zona horaria con la que se fechan los movimientos
     */
    fun build(
        products: List<ProductEntity>,
        movements: List<MovementEntity>,
        businessName: String = "NovaGest",
        today: LocalDate = LocalDate.now(),
        zone: ZoneId = ZoneId.systemDefault(),
        updatedAt: String = ""
    ): WidgetData {
        val activos = products.filter { it.active }
        val delDia = movements.filter { mismaFecha(it.dateEpoch, today, zone) }
        val ventasHoy = delDia.filter { it.type == "VENTA" }
        val inicioMes = today.withDayOfMonth(1)
        val ventasMes = movements.filter {
            it.type == "VENTA" && fecha(it.dateEpoch, zone).let { d -> !d.isBefore(inicioMes) && !d.isAfter(today) }
        }
        // Orden de urgencia: primero los agotados, después los que están en el mínimo y
        // entre ellos el que más valor de venta tiene parado.
        val critico = activos
            .filter { it.stockActual <= it.minStock }
            .sortedWith(compareBy<ProductEntity> { it.stockActual > 0 }.thenByDescending { it.precioVentaUsd * it.minStock })
            .firstOrNull()
        return WidgetData(
            businessName = businessName.ifBlank { "NovaGest" },
            ventasHoyUsd = ventasHoy.sumOf { it.importeUsd },
            unidadesHoy = ventasHoy.sumOf { kotlin.math.abs(it.quantity) },
            ventasMesUsd = ventasMes.sumOf { it.importeUsd },
            stockBajo = activos.count { it.stockActual in 0.0..it.minStock && it.stockActual > 0 },
            agotados = activos.count { it.stockActual <= 0 },
            productoCritico = critico?.name ?: "",
            actualizado = updatedAt.ifBlank { hora(System.currentTimeMillis(), zone) }
        )
    }

    private val horaFmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm")

    private fun hora(epochMs: Long, zone: ZoneId): String =
        java.time.Instant.ofEpochMilli(epochMs).atZone(zone).format(horaFmt)

    private fun fecha(epochMs: Long, zone: ZoneId): LocalDate =
        java.time.Instant.ofEpochMilli(epochMs).atZone(zone).toLocalDate()

    private fun mismaFecha(epochMs: Long, day: LocalDate, zone: ZoneId): Boolean = fecha(epochMs, zone) == day
}
