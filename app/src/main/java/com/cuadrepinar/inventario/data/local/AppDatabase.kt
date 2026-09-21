package com.cuadrepinar.inventario.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.cuadrepinar.inventario.data.local.dao.AuditDao
import com.cuadrepinar.inventario.data.local.dao.BackupDao
import com.cuadrepinar.inventario.data.local.dao.CuadreDao
import com.cuadrepinar.inventario.data.local.dao.ExchangeDao
import com.cuadrepinar.inventario.data.local.dao.MovementDao
import com.cuadrepinar.inventario.data.local.dao.ProductDao
import com.cuadrepinar.inventario.data.local.dao.ReportCacheDao
import com.cuadrepinar.inventario.data.local.dao.SettingsDao
import com.cuadrepinar.inventario.data.local.dao.UserDao
import com.cuadrepinar.inventario.data.local.entity.AuditLogEntity
import com.cuadrepinar.inventario.data.local.entity.BackupEntity
import com.cuadrepinar.inventario.data.local.entity.DailyCuadreEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.MovementEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.data.local.entity.ReportCacheEntity
import com.cuadrepinar.inventario.data.local.entity.SettingsEntity
import com.cuadrepinar.inventario.data.local.entity.UserEntity

@Database(
    entities = [
        ProductEntity::class,
        MovementEntity::class,
        DailyCuadreEntity::class,
        UserEntity::class,
        AuditLogEntity::class,
        ExchangeRateEntity::class,
        BackupEntity::class,
        SettingsEntity::class,
        ReportCacheEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun products(): ProductDao
    abstract fun movements(): MovementDao
    abstract fun cuadre(): CuadreDao
    abstract fun users(): UserDao
    abstract fun audit(): AuditDao
    abstract fun exchange(): ExchangeDao
    abstract fun backups(): BackupDao
    abstract fun settings(): SettingsDao
    abstract fun reportCache(): ReportCacheDao
}
