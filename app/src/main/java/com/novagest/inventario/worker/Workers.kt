package com.novagest.inventario.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.hilt.work.HiltWorker
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.novagest.inventario.R
import com.novagest.inventario.data.backup.BackupManager
import com.novagest.inventario.data.local.AppDatabase
import com.novagest.inventario.util.Dates
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.domain.usecase.DayCloseCheck
import com.novagest.inventario.domain.model.Role
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

@HiltWorker
class BackupWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val backups: BackupManager,
    private val db: AppDatabase
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val admin = db.users().byUsername("admin") ?: return Result.retry()
        val actor = UserAccount(id = admin.id, username = admin.username, displayName = admin.displayName, email = admin.email, role = Role.ADMINISTRADOR)
        backups.create(actor, automatic = true)
        return Result.success()
    }
}

@HiltWorker
class LowStockWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val db: AppDatabase
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val low = db.products().all().filter { it.active && it.stockActual <= it.minStock }
        if (low.isEmpty()) return Result.success()
        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(NotificationChannel("alerts", applicationContext.getString(R.string.channel_alerts), NotificationManager.IMPORTANCE_DEFAULT))
        }
        val n = NotificationCompat.Builder(applicationContext, "alerts")
            .setSmallIcon(android.R.drawable.stat_notify_error)
            .setContentTitle("Stock bajo · NovaGest")
            .setContentText("${low.size} producto(s) en o por debajo del mínimo.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(low.take(8).joinToString("\n") { "• ${it.name}: ${it.stockActual}" }))
            .setAutoCancel(true)
            .build()
        nm.notify(1001, n)
        return Result.success()
    }
}

/**
 * Aviso de cierre: si a la hora de cierre hay ventas del día sin cuadre, avisa (A-08).
 *
 * Comprueba el estado real antes de molestar: un día sin ventas o ya cuadrado no
 * genera notificación.
 */
@HiltWorker
class DayCloseWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val db: AppDatabase
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val today = LocalDate.now()
        val start = Dates.startOfDay(today)
        val end = Dates.endOfDay(today)
        val hasCuadre = db.cuadre().byDate(start) != null
        val sales = db.movements().inRange(start, end).count { it.type == MovementType.VENTA.name }
        if (!DayCloseCheck.needsReminder(hasCuadre, LocalTime.now().hour, sales)) return Result.success()

        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel("alerts", applicationContext.getString(R.string.channel_alerts), NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val n = NotificationCompat.Builder(applicationContext, "alerts")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(DayCloseCheck.title(hasCuadre))
            .setContentText(DayCloseCheck.message(sales))
            .setStyle(NotificationCompat.BigTextStyle().bigText(DayCloseCheck.message(sales)))
            .setAutoCancel(true)
            .build()
        nm.notify(1002, n)
        return Result.success()
    }
}

object WorkScheduler {

    /** Nombre del trabajo periódico del aviso de cierre. */
    const val DAY_CLOSE_WORK = "day-close"

    /** Programa (o cancela) el aviso de cierre de las 20:00. */
    fun scheduleDayClose(context: Context, enabled: Boolean = true) {
        val wm = WorkManager.getInstance(context)
        if (!enabled) {
            wm.cancelUniqueWork(DAY_CLOSE_WORK)
            return
        }
        val now = LocalDateTime.now()
        var next = now.withHour(DayCloseCheck.HOUR).withMinute(0).withSecond(0).withNano(0)
        if (!next.isAfter(now)) next = next.plusDays(1)
        wm.enqueueUniquePeriodicWork(
            DAY_CLOSE_WORK,
            ExistingPeriodicWorkPolicy.UPDATE,
            PeriodicWorkRequestBuilder<DayCloseWorker>(1, TimeUnit.DAYS)
                .setInitialDelay(Duration.between(now, next))
                .build()
        )
    }

    fun schedule(context: Context) {
        val wm = WorkManager.getInstance(context)
        val constraints = Constraints.Builder().setRequiresBatteryNotLow(true).build()
        wm.enqueueUniquePeriodicWork(
            "auto-backup",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<BackupWorker>(1, TimeUnit.DAYS).setConstraints(constraints).build()
        )
        wm.enqueueUniquePeriodicWork(
            "low-stock",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<LowStockWorker>(12, TimeUnit.HOURS).build()
        )
        scheduleDayClose(context)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            WorkScheduler.schedule(context)
        }
    }
}
