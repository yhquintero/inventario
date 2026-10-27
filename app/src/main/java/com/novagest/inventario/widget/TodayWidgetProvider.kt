package com.novagest.inventario.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.novagest.inventario.MainActivity
import com.novagest.inventario.R

/**
 * A-04 · Widget de inicio «Hoy en NovaGest».
 *
 * Enseña la venta del día, las unidades, la venta del mes y el estado de las existencias
 * **sin abrir la app**. Los datos los deja preparados la propia app ([WidgetSnapshot]) en las
 * preferencias del widget: dibujar no puede consultar la base de datos (Android corta el
 * `onUpdate` en unos segundos y la app podría estar cerrada).
 *
 * Se actualiza al vender, al sincronizar y cuando el sistema lo pide (cada 30 minutos como
 * mínimo, según `updatePeriodMillis` de `xml/widget_hoy_info.xml`).
 */
class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val datos = WidgetPrefs.leer(context)
        ids.forEach { id -> manager.updateAppWidget(id, vistas(context, datos)) }
    }

    companion object {
        /** Vuelve a dibujar todos los widgets instalados (se llama al vender y al sincronizar). */
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context) ?: return
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
            if (ids.isEmpty()) return
            val datos = WidgetPrefs.leer(context)
            ids.forEach { id -> manager.updateAppWidget(id, vistas(context, datos)) }
        }

        /** Guarda el resumen y repinta: lo usan la venta rápida y la sincronización. */
        fun publish(context: Context, datos: WidgetData) {
            WidgetPrefs.guardar(context, datos)
            refresh(context)
        }

        private fun vistas(context: Context, datos: WidgetData): RemoteViews {
            val vistas = RemoteViews(context.packageName, R.layout.widget_hoy)
            vistas.setTextViewText(R.id.widgetNegocio, datos.businessName)
            vistas.setTextViewText(R.id.widgetVenta, datos.ventaHoy)
            vistas.setTextViewText(R.id.widgetDetalle, datos.detalleHoy)
            vistas.setTextViewText(R.id.widgetExistencias, datos.existencias)
            vistas.setTextViewText(R.id.widgetCritico, datos.critico)
            vistas.setTextViewText(R.id.widgetPie, datos.pie)
            // El aviso de existencias se ve en rojo cuando hay algo agotado o en el mínimo.
            vistas.setInt(
                R.id.widgetExistencias, "setTextColor",
                if (datos.hayAlerta) 0xFFFCA5A5.toInt() else 0xFF6EE7B7.toInt()
            )
            vistas.setViewVisibility(R.id.widgetCritico, if (datos.critico.isBlank()) android.view.View.GONE else android.view.View.VISIBLE)
            vistas.setOnClickPendingIntent(R.id.widgetRaiz, abrirApp(context))
            return vistas
        }

        private fun abrirApp(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("novagest.destino", "pos")
            }
            val banderas = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            return PendingIntent.getActivity(context, 0, intent, banderas)
        }
    }
}
