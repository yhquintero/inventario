package com.cuadrepinar.inventario.data.local

import android.content.Context
import com.cuadrepinar.inventario.data.local.entity.AuditLogEntity
import com.cuadrepinar.inventario.data.local.entity.DailyCuadreEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.MovementEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.data.local.entity.SettingsEntity
import com.cuadrepinar.inventario.data.local.entity.UserEntity
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.usecase.StockCalculator
import com.cuadrepinar.inventario.security.PasswordHasher
import com.cuadrepinar.inventario.util.Dates
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

object DatabaseSeeder {

    suspend fun seedIfEmpty(context: Context, db: AppDatabase) {
        if (db.users().count() > 0) return

        val users = defaultUsers()
        users.forEach { db.users().insert(it) }
        val admin = db.users().byUsername("admin") ?: return

        db.settings().upsert(SettingsEntity())
        db.exchange().insert(
            ExchangeRateEntity(pair = "CUP/USD", rate = 540.0, dateEpoch = Dates.startOfDay(LocalDate.of(2026, 9, 14)), userId = admin.id, note = "Semilla Excel")
        )
        db.exchange().insert(
            ExchangeRateEntity(pair = "MXN/USD", rate = 20.0, dateEpoch = Dates.startOfDay(LocalDate.of(2026, 9, 14)), userId = admin.id, note = "Semilla Excel")
        )

        val json = context.assets.open("seed.json").bufferedReader().use { it.readText() }
        val root = JSONObject(json)
        val productsArr = root.getJSONArray("products")
        val byName = mutableMapOf<String, ProductEntity>()
        for (i in 0 until productsArr.length()) {
            val o = productsArr.getJSONObject(i)
            val name = o.getString("name").trim()
            val stock = o.optDouble("stockInicial", 0.0)
            val entity = ProductEntity(
                name = name,
                stockInicial = stock,
                stockActual = stock,
                precioVentaUsd = o.optDouble("precioVentaUsd", 0.0),
                comisionCup = o.optDouble("comisionCup", 0.0),
                minStock = if (stock > 0) 1.0 else 0.0,
                category = categorize(name)
            )
            val id = db.products().insert(entity)
            byName[name.uppercase()] = entity.copy(id = id)
        }

        val movs = root.optJSONArray("movements") ?: JSONArray()
        for (i in 0 until movs.length()) {
            val o = movs.getJSONObject(i)
            val name = o.getString("product").trim()
            val product = byName[name.uppercase()] ?: continue
            val type = MovementType.from(o.getString("type"))
            val qty = o.optDouble("quantity", 0.0)
            val center = SaleCenter.from(o.optString("center", "MOV"))
            val date = LocalDate.parse(o.getString("date"))
            val stockIni = product.stockActual
            if (StockCalculator.wouldGoNegative(stockIni, type, qty) && type != MovementType.ENTRADA) {
                // Excel permite negativos; la app los registra pero deja constancia.
            }
            val stockFin = StockCalculator.stockFinal(stockIni, type, qty)
            val price = if (type == MovementType.VENTA) product.precioVentaUsd else 0.0
            val importe = StockCalculator.importeUsd(type, qty, product.precioVentaUsd)
            val comm = StockCalculator.comisionCup(center, qty, product.comisionCup)
            db.movements().insert(
                MovementEntity(
                    dateEpoch = Dates.startOfDay(date),
                    weekday = o.optString("weekday"),
                    productId = product.id,
                    type = type.name,
                    quantity = qty,
                    unitPriceUsd = price,
                    importeUsd = importe,
                    center = center.name,
                    comisionCup = comm,
                    stockInicial = stockIni,
                    stockFinal = stockFin,
                    userId = admin.id,
                    notes = "Importado de Nuevo Cuadre Pinar.xlsx"
                )
            )
            val updated = product.copy(stockActual = stockFin)
            db.products().update(updated)
            byName[name.uppercase()] = updated
        }

        val cuadres = root.optJSONArray("cuadres") ?: JSONArray()
        for (i in 0 until cuadres.length()) {
            val o = cuadres.getJSONObject(i)
            val date = LocalDate.parse(o.getString("date"))
            fun num(key: String): Double {
                if (!o.has(key) || o.isNull(key)) return 0.0
                return try {
                    o.getDouble(key)
                } catch (_: Exception) {
                    0.0
                }
            }
            db.cuadre().upsert(
                DailyCuadreEntity(
                    dateEpoch = Dates.startOfDay(date),
                    weekday = o.optString("weekday"),
                    cupUsd = num("cupUsd").takeIf { it > 0 } ?: 540.0,
                    mxnUsd = num("mxnUsd").takeIf { it > 0 } ?: 20.0,
                    cobroUsd = num("cobroUsd"),
                    cobroZelle = num("cobroZelle"),
                    cobroMxn = num("cobroMxn"),
                    cobroCupEfectivo = num("cobroCupEfectivo"),
                    cobroCupTransf = num("cobroCupTransf"),
                    cobroEuropa = num("cobroEuropa"),
                    entradaCup = num("entradaCup"),
                    entradaUsd = num("entradaUsd"),
                    extraccionCup = num("extraccionCup"),
                    extraccionUsd = num("extraccionUsd"),
                    fondoInicialCup = num("fondoInicialCup"),
                    fondoInicialUsd = num("fondoInicialUsd"),
                    cambioCup = num("cambioCup"),
                    cambioUsd = 0.0,
                    domicilioCup = num("domicilioCup"),
                    domicilioUsd = 0.0,
                    otrosGastosCup = num("otrosGastosCup"),
                    otrosGastosUsd = 0.0,
                    otrosGastosObs = o.optString("otrosGastosObs", ""),
                    comisionesCup = num("comisionesCup"),
                    comisionesUsd = 0.0,
                    closed = i == 0,
                    userId = admin.id
                )
            )
        }

        db.audit().insert(
            AuditLogEntity(
                userId = admin.id,
                userName = "admin",
                action = "SEED",
                entity = "database",
                entityId = null,
                details = "Carga inicial desde Nuevo Cuadre Pinar.xlsx (${byName.size} productos)"
            )
        )
    }

    private fun defaultUsers(): List<UserEntity> {
        fun user(username: String, name: String, email: String, role: String, password: String, question: String, answer: String): UserEntity {
            val salt = PasswordHasher.newSalt()
            val ansSalt = PasswordHasher.newSalt()
            return UserEntity(
                username = username,
                displayName = name,
                email = email,
                passwordHash = PasswordHasher.hash(password, salt),
                salt = salt,
                role = role,
                securityQuestion = question,
                securityAnswerHash = PasswordHasher.hash(answer.lowercase().trim(), ansSalt) + ":" + ansSalt
            )
        }
        return listOf(
            user("admin", "Yosvany Hernández", "admin@cuadrepinar.cu", "ADMINISTRADOR", "Admin123!", "¿Ciudad de la tienda?", "pinar"),
            user("jefe", "Jefe de Tienda", "jefe@cuadrepinar.cu", "JEFE", "Jefe123!", "¿Ciudad de la tienda?", "pinar"),
            user("economico", "Área Económica", "economia@cuadrepinar.cu", "ECONOMICO", "Eco123!", "¿Ciudad de la tienda?", "pinar"),
            user("almacenero", "Almacén Pinar", "almacen@cuadrepinar.cu", "ALMACENERO", "Alma123!", "¿Ciudad de la tienda?", "pinar")
        )
    }

    fun categorize(name: String): String {
        val n = name.uppercase()
        return when {
            listOf("NEVERA", "REFRIGERADOR", "MINIBAR", "EXHIBIDOR", "VITRINA").any { it in n } -> "Refrigeración"
            listOf("LAVADORA", "SECADORA").any { it in n } -> "Lavado"
            listOf("TV", "BOCINA", "EQUIPO DE MUSICA").any { it in n } -> "Audio y TV"
            listOf("PANEL", "INVERSOR", "BATERIA", "ESTACION", "SISTEMA", "KIT DE INSTALACION", "CONECTOR").any { it in n } -> "Solar / Energía"
            listOf("SPLIT", "VENTILADOR", "CALENTADOR").any { it in n } -> "Clima"
            listOf("FOGON", "OLLA", "LICUADORA", "CAFETERA", "FREIDORA", "MICROONDAS", "HORNO", "SANDWICHERA").any { it in n } -> "Cocina"
            listOf("LAMPARA", "LUZ", "LED", "TUBO").any { it in n } -> "Iluminación"
            else -> "General"
        }
    }
}
