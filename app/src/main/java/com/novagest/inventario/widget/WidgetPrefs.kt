package com.novagest.inventario.widget

import android.content.Context

/**
 * A-04 · Guardado del resumen del widget en las preferencias del equipo.
 *
 * Se usa `SharedPreferences` (y no la base de datos) porque el widget tiene que poder dibujar
 * en milisegundos, aunque la app esté cerrada o la base de datos bloqueada por una escritura.
 */
object WidgetPrefs {
    private const val FILE = "novagest_widget"
    private const val K_NEGOCIO = "negocio"
    private const val K_VENTA = "ventaHoy"
    private const val K_UNIDADES = "unidadesHoy"
    private const val K_MES = "ventasMes"
    private const val K_BAJO = "stockBajo"
    private const val K_AGOTADOS = "agotados"
    private const val K_CRITICO = "critico"
    private const val K_ACTUALIZADO = "actualizado"

    fun guardar(context: Context, datos: WidgetData) {
        context.applicationContext
            .getSharedPreferences(FILE, Context.MODE_PRIVATE)
            .edit()
            .putString(K_NEGOCIO, datos.businessName)
            .putLong(K_VENTA, (datos.ventasHoyUsd * 100).toLong())
            .putLong(K_UNIDADES, (datos.unidadesHoy * 100).toLong())
            .putLong(K_MES, (datos.ventasMesUsd * 100).toLong())
            .putInt(K_BAJO, datos.stockBajo)
            .putInt(K_AGOTADOS, datos.agotados)
            .putString(K_CRITICO, datos.productoCritico)
            .putString(K_ACTUALIZADO, datos.actualizado)
            .apply()
    }

    fun leer(context: Context): WidgetData {
        val p = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        // Sin datos todavía: el widget invita a abrir la app en vez de enseñar ceros engañosos.
        if (!p.contains(K_VENTA)) return WidgetData()
        return WidgetData(
            businessName = p.getString(K_NEGOCIO, "NovaGest") ?: "NovaGest",
            ventasHoyUsd = p.getLong(K_VENTA, 0L) / 100.0,
            unidadesHoy = p.getLong(K_UNIDADES, 0L) / 100.0,
            ventasMesUsd = p.getLong(K_MES, 0L) / 100.0,
            stockBajo = p.getInt(K_BAJO, 0),
            agotados = p.getInt(K_AGOTADOS, 0),
            productoCritico = p.getString(K_CRITICO, "") ?: "",
            actualizado = p.getString(K_ACTUALIZADO, "") ?: ""
        )
    }

    fun borrar(context: Context) {
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().clear().apply()
    }
}
