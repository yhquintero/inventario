package com.cuadrepinar.inventario.data.repository

import com.cuadrepinar.inventario.data.local.AppDatabase
import com.cuadrepinar.inventario.data.local.entity.AuditLogEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.data.local.entity.UserEntity
import com.cuadrepinar.inventario.data.local.toEntity
import com.cuadrepinar.inventario.data.local.toModel
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.AuditEntry
import com.cuadrepinar.inventario.domain.model.ComprobacionRow
import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.ExchangeRate
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Product
import com.cuadrepinar.inventario.domain.model.ReportFilter
import com.cuadrepinar.inventario.domain.model.Role
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.domain.usecase.StockCalculator
import com.cuadrepinar.inventario.domain.usecase.Validators
import com.cuadrepinar.inventario.security.PasswordHasher
import com.cuadrepinar.inventario.security.SessionManager
import com.cuadrepinar.inventario.util.Dates
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val db: AppDatabase,
    private val session: SessionManager
) {
    suspend fun login(username: String, password: String): AppResult<UserAccount> {
        val user = db.users().byUsername(username.trim())
            ?: return AppResult.Err("Usuario o contraseña incorrectos.")
        if (!user.active) return AppResult.Err("La cuenta está desactivada.")
        if (!PasswordHasher.verify(password, user.salt, user.passwordHash)) {
            audit(user.id, user.username, "LOGIN_FAIL", "users", user.id, "Contraseña inválida")
            return AppResult.Err("Usuario o contraseña incorrectos.")
        }
        val updated = user.copy(lastLoginAt = System.currentTimeMillis())
        db.users().update(updated)
        session.save(updated.id, updated.username, updated.role, updated.displayName)
        audit(updated.id, updated.username, "LOGIN", "users", updated.id, "Inicio de sesión")
        return AppResult.Ok(updated.toModel())
    }

    suspend fun loginById(userId: Long): AppResult<UserAccount> {
        val user = db.users().get(userId) ?: return AppResult.Err("Sesión inválida.")
        if (!user.active) return AppResult.Err("La cuenta está desactivada.")
        session.save(user.id, user.username, user.role, user.displayName)
        audit(user.id, user.username, "LOGIN_BIOMETRIC", "users", user.id, "Entrada biométrica")
        return AppResult.Ok(user.toModel())
    }

    suspend fun restoreSession(): UserAccount? {
        if (!session.isLoggedIn()) return null
        return db.users().get(session.userId())?.takeIf { it.active }?.toModel()
    }

    fun logout() {
        val id = session.userId()
        val name = session.username() ?: ""
        session.clear()
        // fire-and-forget audit is handled by caller
        lastLogout = id to name
    }

    var lastLogout: Pair<Long, String>? = null

    suspend fun recoverPassword(username: String, answer: String, newPassword: String): AppResult<Unit> {
        Validators.password(newPassword)?.let { return AppResult.Err(it) }
        val user = db.users().byUsername(username.trim())
            ?: return AppResult.Err("No existe ese usuario.")
        val parts = user.securityAnswerHash.split(":")
        if (parts.size != 2) return AppResult.Err("Este usuario no tiene pregunta de recuperación.")
        val expected = parts[0]
        val salt = parts[1]
        if (!PasswordHasher.verify(answer.lowercase().trim(), salt, expected)) {
            return AppResult.Err("La respuesta de seguridad no coincide.")
        }
        val newSalt = PasswordHasher.newSalt()
        db.users().update(user.copy(passwordHash = PasswordHasher.hash(newPassword, newSalt), salt = newSalt))
        audit(user.id, user.username, "PASSWORD_RESET", "users", user.id, "Recuperación por pregunta de seguridad")
        return AppResult.Ok(Unit)
    }

    suspend fun securityQuestion(username: String): String? =
        db.users().byUsername(username.trim())?.securityQuestion

    private suspend fun audit(userId: Long, name: String, action: String, entity: String, entityId: Long?, details: String) {
        db.audit().insert(AuditLogEntity(userId = userId, userName = name, action = action, entity = entity, entityId = entityId, details = details))
    }
}

@Singleton
class ProductRepository @Inject constructor(private val db: AppDatabase) {
    fun observe(): Flow<List<Product>> = db.products().observeAll().map { it.map { e -> e.toModel() } }
    fun observeLowStock(): Flow<List<Product>> = db.products().observeLowStock().map { it.map { e -> e.toModel() } }
    suspend fun get(id: Long) = db.products().get(id)?.toModel()
    suspend fun search(q: String) = db.products().search(q).map { it.toModel() }

    suspend fun save(product: Product, actor: UserAccount): AppResult<Long> {
        Validators.productName(product.name)?.let { return AppResult.Err(it) }
        Validators.nonNegative(product.stockInicial, "Stock inicial")?.let { return AppResult.Err(it) }
        Validators.nonNegative(product.precioVentaUsd, "Precio de venta")?.let { return AppResult.Err(it) }
        Validators.nonNegative(product.comisionCup, "Comisión")?.let { return AppResult.Err(it) }
        val existing = db.products().byName(product.name)
        if (existing != null && existing.id != product.id) return AppResult.Err("Ya existe un producto con ese nombre.")
        return try {
            val id = if (product.id == 0L) {
                val stock = product.stockActual.takeIf { it > 0 } ?: product.stockInicial
                db.products().insert(product.copy(stockActual = stock).toEntity())
            } else {
                val current = db.products().get(product.id) ?: return AppResult.Err("Producto no encontrado.")
                db.products().update(
                    product.copy(stockActual = current.stockActual).toEntity()
                )
                product.id
            }
            db.audit().insert(
                AuditLogEntity(
                    userId = actor.id, userName = actor.username, action = if (product.id == 0L) "CREATE" else "UPDATE",
                    entity = "product", entityId = id, details = product.name
                )
            )
            AppResult.Ok(id)
        } catch (e: Exception) {
            AppResult.Err(e.message ?: "No se pudo guardar el producto.")
        }
    }

    suspend fun delete(product: Product, actor: UserAccount): AppResult<Unit> {
        val entity = db.products().get(product.id) ?: return AppResult.Err("Producto no encontrado.")
        db.products().delete(entity)
        db.audit().insert(
            AuditLogEntity(userId = actor.id, userName = actor.username, action = "DELETE", entity = "product", entityId = product.id, details = product.name)
        )
        return AppResult.Ok(Unit)
    }

    suspend fun all() = db.products().all().map { it.toModel() }
}

@Singleton
class MovementRepository @Inject constructor(private val db: AppDatabase) {
    fun observe(): Flow<List<Movement>> = combine(
        db.movements().observeAll(),
        db.products().observeAll(),
        db.users().observeAll()
    ) { movs, products, users ->
        val pMap = products.associateBy { it.id }
        val uMap = users.associateBy { it.id }
        movs.map { it.toModel(pMap[it.productId]?.name ?: "—", uMap[it.userId]?.displayName ?: "") }
    }

    suspend fun register(
        productId: Long,
        type: MovementType,
        quantity: Double,
        center: SaleCenter,
        date: LocalDate,
        actor: UserAccount,
        notes: String = "",
        overridePrice: Double? = null
    ): AppResult<Long> {
        StockCalculator.validateQuantity(quantity)?.let { return AppResult.Err(it) }
        val product = db.products().get(productId) ?: return AppResult.Err("Producto no encontrado.")
        val stockIni = product.stockActual
        if (StockCalculator.wouldGoNegative(stockIni, type, quantity)) {
            return AppResult.Err("Stock insuficiente. Disponible: ${StockCalculator.round2(stockIni)}.")
        }
        val unitPrice = when {
            type != MovementType.VENTA -> 0.0
            overridePrice != null -> overridePrice
            else -> product.precioVentaUsd
        }
        val importe = StockCalculator.importeUsd(type, quantity, if (overridePrice != null) overridePrice else product.precioVentaUsd)
        val comm = StockCalculator.comisionVenta(type, quantity, product.comisionCup)
        val stockFin = StockCalculator.stockFinal(stockIni, type, quantity)
        val id = db.movements().insert(
            com.cuadrepinar.inventario.data.local.entity.MovementEntity(
                dateEpoch = Dates.startOfDay(date),
                weekday = Dates.weekday(date),
                productId = product.id,
                type = type.name,
                quantity = quantity,
                unitPriceUsd = unitPrice,
                importeUsd = importe,
                center = center.name,
                comisionCup = comm,
                stockInicial = stockIni,
                stockFinal = stockFin,
                userId = actor.id,
                notes = notes
            )
        )
        db.products().updateStock(product.id, stockFin)
        db.audit().insert(
            AuditLogEntity(
                userId = actor.id, userName = actor.username, action = "MOVEMENT",
                entity = "movement", entityId = id,
                details = "${type.name} ${quantity} × ${product.name} (${center.name}) stock ${stockIni}→${stockFin}"
            )
        )
        return AppResult.Ok(id)
    }

    suspend fun delete(id: Long, actor: UserAccount): AppResult<Unit> {
        val mov = db.movements().get(id) ?: return AppResult.Err("Movimiento no encontrado.")
        db.movements().delete(mov)
        recalculateProduct(mov.productId)
        db.audit().insert(
            AuditLogEntity(userId = actor.id, userName = actor.username, action = "DELETE", entity = "movement", entityId = id, details = "Movimiento ${mov.type} eliminado")
        )
        return AppResult.Ok(Unit)
    }

    suspend fun recalculateProduct(productId: Long) {
        val product = db.products().get(productId) ?: return
        var stock = product.stockInicial
        val movs = db.movements().byProduct(productId).sortedWith(compareBy({ it.dateEpoch }, { it.id }))
        for (m in movs) {
            val type = MovementType.from(m.type)
            val fin = StockCalculator.stockFinal(stock, type, m.quantity)
            if (m.stockInicial != stock || m.stockFinal != fin) {
                db.movements().update(m.copy(stockInicial = stock, stockFinal = fin))
            }
            stock = fin
        }
        db.products().updateStock(productId, stock)
    }

    suspend fun inRange(from: Long, to: Long): List<Movement> {
        val products = db.products().all().associateBy { it.id }
        val users = db.users().all().associateBy { it.id }
        return db.movements().inRange(from, to).map {
            it.toModel(products[it.productId]?.name ?: "—", users[it.userId]?.displayName ?: "")
        }
    }
}

@Singleton
class CuadreRepository @Inject constructor(private val db: AppDatabase) {
    fun observe() = db.cuadre().observeAll().map { it.map { e -> e.toModel() } }

    suspend fun forDate(date: LocalDate): DailyCuadre {
        val epoch = Dates.startOfDay(date)
        val existing = db.cuadre().byDate(epoch)
        if (existing != null) return existing.toModel()
        val latestCup = db.exchange().latest("CUP/USD")?.rate ?: 540.0
        val latestMxn = db.exchange().latest("MXN/USD")?.rate ?: 20.0
        return DailyCuadre(dateEpoch = epoch, weekday = Dates.weekday(date), cupUsd = latestCup, mxnUsd = latestMxn)
    }

    suspend fun save(cuadre: DailyCuadre, actor: UserAccount): AppResult<Long> {
        val id = db.cuadre().upsert(cuadre.copy(userId = actor.id).toEntity())
        db.exchange().insert(ExchangeRateEntity(pair = "CUP/USD", rate = cuadre.cupUsd, dateEpoch = cuadre.dateEpoch, userId = actor.id))
        db.exchange().insert(ExchangeRateEntity(pair = "MXN/USD", rate = cuadre.mxnUsd, dateEpoch = cuadre.dateEpoch, userId = actor.id))
        db.audit().insert(
            AuditLogEntity(userId = actor.id, userName = actor.username, action = "CUADRE", entity = "cuadre", entityId = id, details = "Cuadre ${cuadre.weekday} ${Dates.format(cuadre.dateEpoch)}")
        )
        return AppResult.Ok(id)
    }
}

@Singleton
class ReportRepository @Inject constructor(
    private val db: AppDatabase,
    private val movements: MovementRepository
) {
    suspend fun comprobacion(from: Long, to: Long): List<ComprobacionRow> {
        val products = db.products().all()
        val movs = movements.inRange(from, to)
        return products.map { p ->
            val mine = movs.filter { it.productId == p.id }
            val ventas = mine.filter { it.type == MovementType.VENTA }.sumOf { it.quantity }
            val entradas = mine.filter { it.type == MovementType.ENTRADA }.sumOf { it.quantity }
            val salidas = mine.filter { it.type == MovementType.SALIDA }.sumOf { it.quantity }
            val stockCalc = StockCalculator.stockCalculado(p.stockInicial, ventas, entradas, salidas)
            val importeOriginal = StockCalculator.round2(ventas * p.precioVentaUsd)
            val importeReal = StockCalculator.round2(mine.filter { it.type == MovementType.VENTA }.sumOf { it.importeUsd })
            ComprobacionRow(
                productId = p.id,
                product = p.name,
                stockInicial = p.stockInicial,
                ventas = ventas,
                entradas = entradas,
                salidas = salidas,
                stockCalculado = stockCalc,
                stockFinal = p.stockActual,
                precioVenta = p.precioVentaUsd,
                importeOriginal = importeOriginal,
                importeReal = importeReal,
                diferenciaImporte = StockCalculator.round2(importeOriginal - importeReal)
            )
        }
    }

    suspend fun filtered(filter: ReportFilter): List<Movement> {
        return movements.inRange(filter.fromEpoch, filter.toEpoch).filter { m ->
            (filter.productId == null || m.productId == filter.productId) &&
                (filter.type == null || m.type == filter.type) &&
                (filter.center == null || m.center == filter.center) &&
                (filter.userId == null || m.userId == filter.userId)
        }
    }
}

@Singleton
class UserRepository @Inject constructor(private val db: AppDatabase) {
    fun observe(): Flow<List<UserAccount>> = db.users().observeAll().map { it.map { e -> e.toModel() } }

    suspend fun save(
        account: UserAccount,
        password: String?,
        actor: UserAccount,
        securityQuestion: String = account.securityQuestion,
        securityAnswer: String? = null
    ): AppResult<Long> {
        Validators.username(account.username)?.let { return AppResult.Err(it) }
        Validators.email(account.email)?.let { return AppResult.Err(it) }
        val existing = db.users().byUsername(account.username)
        if (existing != null && existing.id != account.id) return AppResult.Err("Ese usuario ya existe.")
        if (account.id == 0L) {
            val pwd = password ?: return AppResult.Err("La contraseña es obligatoria.")
            Validators.password(pwd)?.let { return AppResult.Err(it) }
            val salt = PasswordHasher.newSalt()
            val ansSalt = PasswordHasher.newSalt()
            val id = db.users().insert(
                UserEntity(
                    username = account.username.trim(),
                    displayName = account.displayName.trim(),
                    email = account.email.trim(),
                    passwordHash = PasswordHasher.hash(pwd, salt),
                    salt = salt,
                    role = account.role.name,
                    active = account.active,
                    biometricEnabled = account.biometricEnabled,
                    securityQuestion = securityQuestion,
                    securityAnswerHash = if (securityAnswer.isNullOrBlank()) "" else PasswordHasher.hash(securityAnswer.lowercase().trim(), ansSalt) + ":" + ansSalt
                )
            )
            db.audit().insert(AuditLogEntity(userId = actor.id, userName = actor.username, action = "CREATE", entity = "users", entityId = id, details = account.username))
            return AppResult.Ok(id)
        }
        val current = db.users().get(account.id) ?: return AppResult.Err("Usuario no encontrado.")
        var hash = current.passwordHash
        var salt = current.salt
        if (!password.isNullOrBlank()) {
            Validators.password(password)?.let { return AppResult.Err(it) }
            salt = PasswordHasher.newSalt()
            hash = PasswordHasher.hash(password, salt)
        }
        var ans = current.securityAnswerHash
        if (!securityAnswer.isNullOrBlank()) {
            val ansSalt = PasswordHasher.newSalt()
            ans = PasswordHasher.hash(securityAnswer.lowercase().trim(), ansSalt) + ":" + ansSalt
        }
        db.users().update(
            current.copy(
                username = account.username.trim(),
                displayName = account.displayName.trim(),
                email = account.email.trim(),
                passwordHash = hash,
                salt = salt,
                role = account.role.name,
                active = account.active,
                biometricEnabled = account.biometricEnabled,
                securityQuestion = securityQuestion,
                securityAnswerHash = ans
            )
        )
        db.audit().insert(AuditLogEntity(userId = actor.id, userName = actor.username, action = "UPDATE", entity = "users", entityId = account.id, details = account.username))
        return AppResult.Ok(account.id)
    }

    suspend fun setActive(id: Long, active: Boolean, actor: UserAccount): AppResult<Unit> {
        val user = db.users().get(id) ?: return AppResult.Err("Usuario no encontrado.")
        if (user.role == Role.ADMINISTRADOR.name && !active) {
            val admins = db.users().all().count { it.role == Role.ADMINISTRADOR.name && it.active && it.id != id }
            if (admins == 0) return AppResult.Err("No se puede desactivar al último administrador.")
        }
        db.users().update(user.copy(active = active))
        db.audit().insert(AuditLogEntity(userId = actor.id, userName = actor.username, action = if (active) "ACTIVATE" else "DEACTIVATE", entity = "users", entityId = id, details = user.username))
        return AppResult.Ok(Unit)
    }

    suspend fun delete(id: Long, actor: UserAccount): AppResult<Unit> {
        val user = db.users().get(id) ?: return AppResult.Err("Usuario no encontrado.")
        if (user.id == actor.id) return AppResult.Err("No puedes eliminarte a ti mismo.")
        db.users().delete(user)
        db.audit().insert(AuditLogEntity(userId = actor.id, userName = actor.username, action = "DELETE", entity = "users", entityId = id, details = user.username))
        return AppResult.Ok(Unit)
    }
}

@Singleton
class AuditRepository @Inject constructor(private val db: AppDatabase) {
    fun observe(): Flow<List<AuditEntry>> = db.audit().observeAll().map { it.map { e -> e.toModel() } }
}

@Singleton
class SettingsRepository @Inject constructor(private val db: AppDatabase) {
    fun observe() = db.settings().observe()
    suspend fun get() = db.settings().get() ?: com.cuadrepinar.inventario.data.local.entity.SettingsEntity()
    suspend fun save(entity: com.cuadrepinar.inventario.data.local.entity.SettingsEntity) = db.settings().upsert(entity)
}

@Singleton
class ExchangeRepository @Inject constructor(private val db: AppDatabase) {
    fun observe(): Flow<List<ExchangeRate>> = db.exchange().observeAll().map { it.map { e -> e.toModel() } }
    suspend fun add(pair: String, rate: Double, actor: UserAccount, note: String = ""): AppResult<Long> {
        if (rate <= 0) return AppResult.Err("El tipo de cambio debe ser mayor que cero.")
        val id = db.exchange().insert(
            ExchangeRateEntity(pair = pair, rate = rate, dateEpoch = System.currentTimeMillis(), userId = actor.id, note = note)
        )
        db.audit().insert(AuditLogEntity(userId = actor.id, userName = actor.username, action = "EXCHANGE", entity = "exchange", entityId = id, details = "$pair = $rate"))
        return AppResult.Ok(id)
    }
}
