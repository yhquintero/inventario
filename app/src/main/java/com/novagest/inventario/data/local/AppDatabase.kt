package com.novagest.inventario.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.novagest.inventario.data.local.dao.AuditDao
import com.novagest.inventario.data.local.dao.BackupDao
import com.novagest.inventario.data.local.dao.CuadreDao
import com.novagest.inventario.data.local.dao.ExchangeDao
import com.novagest.inventario.data.local.dao.MovementDao
import com.novagest.inventario.data.local.dao.ProductDao
import com.novagest.inventario.data.local.dao.ReportCacheDao
import com.novagest.inventario.data.local.dao.SettingsDao
import com.novagest.inventario.data.local.dao.UserDao
import com.novagest.inventario.data.local.entity.AuditLogEntity
import com.novagest.inventario.data.local.entity.BackupEntity
import com.novagest.inventario.data.local.entity.DailyCuadreEntity
import com.novagest.inventario.data.local.entity.ExchangeRateEntity
import com.novagest.inventario.data.local.entity.MovementEntity
import com.novagest.inventario.data.local.entity.ProductEntity
import com.novagest.inventario.data.local.entity.ReportCacheEntity
import com.novagest.inventario.data.local.entity.SettingsEntity
import com.novagest.inventario.data.local.entity.UserEntity

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
    version = 5,
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

/** Add historical per-sale cost without discarding the existing Room database. */
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE movements ADD COLUMN unitCostUsd REAL NOT NULL DEFAULT 0.0")
        database.execSQL(
            "UPDATE movements SET unitCostUsd = COALESCE((SELECT precioCostoUsd FROM products WHERE products.id = movements.productId), 0) WHERE type = 'VENTA'"
        )
    }
}

/** NovaGest v1.0.0: código de barras en productos. */
val MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE products ADD COLUMN barcode TEXT NOT NULL DEFAULT ''")
    }
}
