package com.novagest.inventario.widget

import android.content.Context
import com.novagest.inventario.data.local.AppDatabase
import com.novagest.inventario.util.Dates
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

/**
 * A-04 · Mantiene al día el widget de inicio.
 *
 * Se llama al abrir la app y cada vez que se cobra una venta, para que el widget enseñe la
 * cifra real sin esperar a que Android lo refresque por su cuenta.
 */
@Singleton
class WidgetUpdater @Inject constructor(
    private val db: AppDatabase,
    @ApplicationContext private val context: Context
) {

    suspend fun actualizar() {
        runCatching {
            val hoy = LocalDate.now()
            val desde = Dates.startOfDay(hoy.withDayOfMonth(1).minusDays(1))
            val hasta = Dates.endOfDay(hoy)
            val productos = db.products().all()
            val movimientos = db.movements().inRange(desde, hasta)
            val ajustes = db.settings().get()
            val datos = WidgetSnapshot.build(
                products = productos,
                movements = movimientos,
                businessName = ajustes?.businessName ?: "NovaGest",
                today = hoy
            )
            TodayWidgetProvider.publish(context, datos)
        }
    }
}
