package com.cuadrepinar.inventario.worker

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
import com.cuadrepinar.inventario.R
import com.cuadrepinar.inventario.data.backup.BackupManager
import com.cuadrepinar.inventario.data.local.AppDatabase
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.domain.model.Role
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
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
            .setContentTitle("Stock bajo · Cuadre Pinar")
            .setContentText("${low.size} producto(s) en o por debajo del mínimo.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(low.take(8).joinToString("\n") { "• ${it.name}: ${it.stockActual}" }))
            .setAutoCancel(true)
            .build()
        nm.notify(1001, n)
        return Result.success()
    }
}

object WorkScheduler {
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
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            WorkScheduler.schedule(context)
        }
    }
}
