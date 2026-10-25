package com.novagest.inventario.domain.usecase

/**
 * Decide si hay que avisar de que el día no está cuadrado (A-08).
 *
 * Lógica pura, sin Android ni base de datos: la usa el aviso programado del
 * teléfono y se prueba en la máquina de desarrollo.
 */
object DayCloseCheck {

    /** Hora a partir de la cual se recuerda el cierre. */
    const val HOUR = 20

    /**
     * ¿Toca recordar el cierre?
     *
     * Solo si ya pasó la hora de cierre, **no** hay cuadre guardado del día y
     * hubo ventas: avisar de un día sin movimiento sería ruido.
     */
    fun needsReminder(hasCuadre: Boolean, hour: Int, sales: Int): Boolean =
        hour >= HOUR && !hasCuadre && sales > 0

    /** Texto del aviso. */
    fun message(sales: Int): String =
        if (sales <= 0) "No hubo ventas hoy: no hay nada que cuadrar."
        else "$sales venta(s) sin cuadre: registra el cierre del día antes de cerrar la caja."

    /** Resumen corto para el título de la notificación. */
    fun title(hasCuadre: Boolean): String =
        if (hasCuadre) "Día cuadrado · NovaGest" else "Falta cuadrar el día · NovaGest"
}
