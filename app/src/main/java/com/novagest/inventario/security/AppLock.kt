package com.novagest.inventario.security

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Preferencia del bloqueo al abrir.
 *
 * Es un booleano, no un dato sensible: por eso vive en SharedPreferences y no en la base
 * de datos (añadir una columna a SettingsEntity obligaría a una migración de Room).
 */
@Singleton
class AppLock @Inject constructor(@ApplicationContext context: Context) {

    private val prefs = context.getSharedPreferences("app_lock", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) {
            prefs.edit().putBoolean("enabled", value).apply()
        }
}
