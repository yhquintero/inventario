package com.novagest.inventario.ui.components

/**
 * Textos e insignias del aviso de sincronización (A-17).
 *
 * La app avisa en el encabezado cuando quedan cambios sin subir: la nube lleva
 * una insignia con el número y el aviso inferior explica cuándo se reintenta.
 * Todo son funciones puras, sin Android, para poder probarlas con JUnit.
 */
object SyncHint {

    /** Número que muestra la insignia del encabezado (0 = no se muestra insignia). */
    fun badge(pending: Int, connected: Boolean, busy: Boolean): Int =
        if (!connected || busy) 0 else pending.coerceAtLeast(0)

    /** Texto del aviso inferior sobre los cambios pendientes. */
    fun banner(pending: Int, retryIn: Long, offline: Boolean): String = when {
        pending > 0 && retryIn > 0 -> "$pending cambio(s) sin subir · reintento en $retryIn s"
        pending > 0 -> "$pending cambio(s) sin subir: se reintentará solo"
        offline -> "Sin conexión con el servidor"
        else -> "Todo sincronizado"
    }

    /** Descripción que leen los lectores de pantalla al enfocar la nube. */
    fun iconLabel(connected: Boolean, busy: Boolean, pending: Int): String = when {
        busy -> "Sincronizando…"
        !connected -> "Sin conexión con el servidor"
        pending > 0 -> "Sincronizado · $pending cambio(s) sin subir"
        else -> "Sincronizado con el servidor"
    }

    /** Texto del botón del aviso: sirve tanto para reintentar como para subir ya. */
    fun actionLabel(pending: Int): String = if (pending > 0) "Sincronizar ahora" else "Reintentar"

    /** Resumen para Ajustes: cuántos cambios quedan y cuándo se suben. */
    fun settingsSummary(pending: Int, retryIn: Long): String = when {
        pending <= 0 -> "No hay cambios pendientes de subir."
        retryIn > 0 -> "$pending cambio(s) sin subir · próximo intento en $retryIn s"
        else -> "$pending cambio(s) sin subir · se subirán en cuanto haya conexión"
    }
}
