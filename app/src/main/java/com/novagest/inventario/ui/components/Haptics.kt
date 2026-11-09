package com.novagest.inventario.ui.components

import android.view.HapticFeedbackConstants
import android.view.View

/**
 * Respuesta táctil (haptics) para los gestos clave de NovaGest:
 * cobrar, escanear, guardar, error. Silenciosa y respetuosa con los
 * ajustes del sistema (no vibra si la app del sistema tiene hápticos apagados).
 */
object Haptics {
    /** Toque ligero — botón, chip, tecla del carrito. */
    fun tap(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    /** Confirmación — venta cobrada, guardado correcto, impresión enviada. */
    fun success(view: View) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        } else {
            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
        }
    }

    /** Error — stock insuficiente, impresora sin responder, fiado sin cliente. */
    fun error(view: View) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            view.performHapticFeedback(HapticFeedbackConstants.REJECT)
        } else {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
    }
}
