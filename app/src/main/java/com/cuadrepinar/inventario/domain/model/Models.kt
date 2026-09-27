package com.cuadrepinar.inventario.domain.model

/**
 * Modelos de dominio que replican el libro "Nuevo Cuadre Pinar.xlsx".
 *
 * Hojas origen:
 *  - Configuracion  → Product
 *  - lunes..sabado  → Movement + DailyCuadre
 *  - COMPROBACION   → ComprobacionRow (reporte semanal)
 */
enum class Role(val label: String, val rank: Int) {
    ADMINISTRADOR("Administrador", 4),
    JEFE("Jefe", 3),
    ECONOMICO("Económico", 2),
    ALMACENERO("Almacenero", 1);

    companion object {
        fun from(raw: String): Role =
            entries.firstOrNull { it.name.equals(raw.trim(), true) || it.label.equals(raw.trim(), true) }
                ?: ALMACENERO
    }
}

enum class MovementType(val label: String) {
    VENTA("VENTA"),
    SALIDA("SALIDA"),
    ENTRADA("ENTRADA");

    companion object {
        fun from(raw: String): MovementType {
            val n = raw.trim().uppercase()
            return entries.firstOrNull { it.name == n }
                ?: when (n) {
                    "VENTA", "VENTAS" -> VENTA
                    "SALIDA", "SALIDAS" -> SALIDA
                    "ENTRADA", "ENTRADAS" -> ENTRADA
                    else -> error("Movimiento desconocido: $raw")
                }
        }
    }
}

/** Columna G del cuadre diario: TIENDA | GESTOR | MOV */
enum class SaleCenter(val label: String) {
    TIENDA("TIENDA"),
    GESTOR("GESTOR"),
    MOV("MOV");

    companion object {
        fun from(raw: String): SaleCenter {
            val n = raw.trim().uppercase()
            return entries.firstOrNull { it.name == n } ?: MOV
        }
    }
}

enum class Permission {
    INVENTORY_VIEW, INVENTORY_EDIT, INVENTORY_DELETE,
    MOVEMENT_VIEW, MOVEMENT_CREATE, MOVEMENT_EDIT, MOVEMENT_DELETE,
    CUADRE_VIEW, CUADRE_EDIT,
    REPORTS_VIEW, REPORTS_EXPORT, REPORTS_FINANCIAL,
    USERS_VIEW, USERS_EDIT,
    AUDIT_VIEW,
    BACKUP_MANAGE,
    SETTINGS_EDIT,
    EXCHANGE_EDIT
}

object RolePermissions {
    private val all = Permission.entries.toSet()

    fun of(role: Role): Set<Permission> = when (role) {
        Role.ADMINISTRADOR -> all
        Role.JEFE -> all - Permission.USERS_EDIT + Permission.USERS_VIEW + Permission.USERS_EDIT
        Role.ECONOMICO -> setOf(
            Permission.INVENTORY_VIEW,
            Permission.MOVEMENT_VIEW,
            Permission.CUADRE_VIEW, Permission.CUADRE_EDIT,
            Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT, Permission.REPORTS_FINANCIAL,
            Permission.EXCHANGE_EDIT,
            Permission.AUDIT_VIEW
        )
        Role.ALMACENERO -> setOf(
            Permission.INVENTORY_VIEW, Permission.INVENTORY_EDIT,
            Permission.MOVEMENT_VIEW, Permission.MOVEMENT_CREATE,
            Permission.CUADRE_VIEW
        )
    }

    fun can(role: Role, permission: Permission): Boolean = permission in of(role)
}

data class Product(
    val id: Long = 0,
    val name: String,
    val stockInicial: Double,
    val stockActual: Double,
    val precioVentaUsd: Double,
    val comisionCup: Double,
    val minStock: Double = 1.0,
    val active: Boolean = true,
    val category: String = "General",
    val notes: String = "",
    val precioCostoUsd: Double = 0.0,
    val precioVenta2Usd: Double = 0.0,
    val observaciones: String = ""
)

data class Movement(
    val id: Long = 0,
    val dateEpoch: Long,
    val weekday: String,
    val productId: Long,
    val productName: String = "",
    val type: MovementType,
    val quantity: Double,
    val unitPriceUsd: Double,
    val importeUsd: Double,
    val center: SaleCenter,
    val comisionCup: Double,
    val stockInicial: Double,
    val stockFinal: Double,
    val userId: Long,
    val userName: String = "",
    val notes: String = ""
)

data class DailyCuadre(
    val id: Long = 0,
    val dateEpoch: Long,
    val weekday: String,
    val cupUsd: Double = 540.0,
    val mxnUsd: Double = 20.0,
    val cobroUsd: Double = 0.0,
    val cobroZelle: Double = 0.0,
    val cobroMxn: Double = 0.0,
    val cobroCupEfectivo: Double = 0.0,
    val cobroCupTransf: Double = 0.0,
    val cobroEuropa: Double = 0.0,
    val entradaCup: Double = 0.0,
    val entradaUsd: Double = 0.0,
    val extraccionCup: Double = 0.0,
    val extraccionUsd: Double = 0.0,
    val fondoInicialCup: Double = 0.0,
    val fondoInicialUsd: Double = 0.0,
    val cambioCup: Double = 0.0,
    val cambioUsd: Double = 0.0,
    val domicilioCup: Double = 0.0,
    val domicilioUsd: Double = 0.0,
    val otrosGastosCup: Double = 0.0,
    val otrosGastosUsd: Double = 0.0,
    val otrosGastosObs: String = "",
    val comisionesCup: Double = 0.0,
    val comisionesUsd: Double = 0.0,
    val closed: Boolean = false,
    val userId: Long = 0
)

data class CuadreTotals(
    val ventaTotal: Double,
    val cobrosUsd: Double,
    val entradaDineroUsd: Double,
    val extraccionTotalUsd: Double,
    val totalGeneral: Double,
    val diferenciaUsd: Double,
    val diferenciaMn: Double,
    val fondoFinalCup: Double,
    val fondoFinalUsd: Double,
    val comisionesMovimientos: Double
)

data class UserAccount(
    val id: Long = 0,
    val username: String,
    val displayName: String,
    val email: String,
    val role: Role,
    val active: Boolean = true,
    val biometricEnabled: Boolean = false,
    val securityQuestion: String = "",
    val createdAt: Long = 0,
    val lastLoginAt: Long? = null
)

data class AuditEntry(
    val id: Long = 0,
    val userId: Long,
    val userName: String,
    val action: String,
    val entity: String,
    val entityId: Long?,
    val details: String,
    val timestamp: Long
)

data class ExchangeRate(
    val id: Long = 0,
    val pair: String,
    val rate: Double,
    val dateEpoch: Long,
    val userId: Long,
    val note: String = ""
)

data class ComprobacionRow(
    val productId: Long,
    val product: String,
    val stockInicial: Double,
    val ventas: Double,
    val entradas: Double,
    val salidas: Double,
    val stockCalculado: Double,
    val stockFinal: Double,
    val precioVenta: Double,
    val importeOriginal: Double,
    val importeReal: Double,
    val diferenciaImporte: Double
)

data class ReportFilter(
    val fromEpoch: Long,
    val toEpoch: Long,
    val productId: Long? = null,
    val type: MovementType? = null,
    val center: SaleCenter? = null,
    val userId: Long? = null
)

sealed class AppResult<out T> {
    data class Ok<T>(val value: T) : AppResult<T>()
    data class Err(val message: String) : AppResult<Nothing>()
}
