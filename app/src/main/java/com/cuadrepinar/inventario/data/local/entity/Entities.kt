package com.cuadrepinar.inventario.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "products", indices = [Index(value = ["name"], unique = true)])
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val stockInicial: Double,
    val stockActual: Double,
    val precioVentaUsd: Double,
    val comisionCup: Double,
    val minStock: Double = 1.0,
    val active: Boolean = true,
    val category: String = "General",
    val notes: String = "",
    val updatedAt: Long = System.currentTimeMillis(),
    val precioCostoUsd: Double = 0.0,
    val precioVenta2Usd: Double = 0.0,
    val observaciones: String = ""
)

@Entity(
    tableName = "movements",
    indices = [Index("productId"), Index("dateEpoch"), Index("type"), Index("center")]
)
data class MovementEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dateEpoch: Long,
    val weekday: String,
    val productId: Long,
    val type: String,
    val quantity: Double,
    val unitPriceUsd: Double,
    val importeUsd: Double,
    val center: String,
    val comisionCup: Double,
    val stockInicial: Double,
    val stockFinal: Double,
    val userId: Long,
    val notes: String = ""
)

@Entity(tableName = "daily_cuadre", indices = [Index(value = ["dateEpoch"], unique = true)])
data class DailyCuadreEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val dateEpoch: Long,
    val weekday: String,
    val cupUsd: Double,
    val mxnUsd: Double,
    val cobroUsd: Double,
    val cobroZelle: Double,
    val cobroMxn: Double,
    val cobroCupEfectivo: Double,
    val cobroCupTransf: Double,
    val cobroEuropa: Double,
    val entradaCup: Double,
    val entradaUsd: Double,
    val extraccionCup: Double,
    val extraccionUsd: Double,
    val fondoInicialCup: Double,
    val fondoInicialUsd: Double,
    val cambioCup: Double,
    val cambioUsd: Double,
    val domicilioCup: Double,
    val domicilioUsd: Double,
    val otrosGastosCup: Double,
    val otrosGastosUsd: Double,
    val otrosGastosObs: String,
    val comisionesCup: Double,
    val comisionesUsd: Double,
    val closed: Boolean,
    val userId: Long
)

@Entity(tableName = "users", indices = [Index(value = ["username"], unique = true)])
data class UserEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val username: String,
    val displayName: String,
    val email: String,
    val passwordHash: String,
    val salt: String,
    val role: String,
    val active: Boolean = true,
    val biometricEnabled: Boolean = false,
    val securityQuestion: String = "",
    val securityAnswerHash: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val lastLoginAt: Long? = null
)

@Entity(tableName = "audit_log", indices = [Index("timestamp"), Index("userId")])
data class AuditLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: Long,
    val userName: String,
    val action: String,
    val entity: String,
    val entityId: Long?,
    val details: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "exchange_rates")
data class ExchangeRateEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val pair: String,
    val rate: Double,
    val dateEpoch: Long,
    val userId: Long,
    val note: String = ""
)

@Entity(tableName = "backups")
data class BackupEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val createdAt: Long,
    val automatic: Boolean,
    val path: String,
    val sizeBytes: Long,
    val note: String = ""
)

@Entity(tableName = "app_settings")
data class SettingsEntity(
    @PrimaryKey val id: Int = 1,
    val theme: String = "system",
    val autoBackupEnabled: Boolean = true,
    val autoBackupHour: Int = 2,
    val lowStockAlerts: Boolean = true,
    val businessName: String = "Cuadre Pinar",
    val defaultCupUsd: Double = 540.0,
    val defaultMxnUsd: Double = 20.0
)

@Entity(tableName = "report_cache")
data class ReportCacheEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val kind: String,
    val payloadJson: String,
    val createdAt: Long = System.currentTimeMillis()
)
