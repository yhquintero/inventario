package com.cuadrepinar.inventario.data.sync

import android.content.Context
import androidx.room.withTransaction
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.cuadrepinar.inventario.data.local.AppDatabase
import com.cuadrepinar.inventario.data.local.entity.DailyCuadreEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.MovementEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.usecase.StockCalculator
import com.cuadrepinar.inventario.util.Dates
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Resultado de una llamada HTTP a la API. */
data class ApiResponse(val code: Int, val body: JSONObject) {
    val ok get() = code in 200..299
    val error: String get() = body.optString("error").ifBlank { if (code == 0) "Sin conexión con el servidor." else "Error $code" }
}

data class SyncStatus(
    val connected: Boolean = false,
    val server: String = "",
    val user: String = "",
    val role: String = "",
    val version: Int = 0,
    val lastSync: Long = 0,
    val busy: Boolean = false,
    val message: String? = null,
    val closedDays: Set<String> = emptySet()
)

/**
 * Sincroniza la App con el mismo servidor que usa la Web (server/cuadre_server.py).
 *
 * - El servidor es la fuente de verdad: guarda un único estado JSON versionado.
 * - pull(): descarga el estado y reemplaza productos, movimientos, cuadres y tasas en Room.
 * - push(): aplica los cambios locales sobre el último JSON descargado y lo sube con su versión
 *   (409 = otro usuario guardó antes → se recarga; 403/423 = sin permiso o día cerrado → se recarga).
 * - Detecta cambios locales observando Room (sin tocar las pantallas) y consulta /api/state/version cada 15 s.
 */
@Singleton
class SyncManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val db: AppDatabase
) {
    private val prefs = EncryptedSharedPreferences.create(
        context, "sync",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val stateFile = File(context.filesDir, "remote_state.json")
    private var jobs: List<Job> = emptyList()
    @Volatile private var applying = false
    @Volatile private var lastLocalSig = ""

    private val _status = MutableStateFlow(
        SyncStatus(connected = token() != null, server = server(), user = prefs.getString("user", "") ?: "", role = prefs.getString("role", "") ?: "")
    )
    val status: StateFlow<SyncStatus> = _status

    fun server(): String = prefs.getString("server", "") ?: ""
    private fun token(): String? = prefs.getString("token", null)
    private fun version(): Int = prefs.getInt("version", -1)
    fun isConnected() = token() != null && server().isNotBlank()

    // ------------------------------------------------------------------ HTTP
    private suspend fun call(path: String, method: String = "GET", body: JSONObject? = null, base: String = server()): ApiResponse =
        withContext(Dispatchers.IO) {
            try {
                val conn = URL(base.trimEnd('/') + "/api" + path).openConnection() as HttpURLConnection
                conn.requestMethod = method
                conn.connectTimeout = 10_000
                conn.readTimeout = 30_000
                conn.setRequestProperty("X-CP", "1")
                conn.setRequestProperty("User-Agent", "CuadrePinarApp Android")
                conn.setRequestProperty("Accept", "application/json")
                token()?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
                if (body != null) {
                    conn.doOutput = true
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }
                val code = conn.responseCode
                val stream = if (code >= 400) conn.errorStream else conn.inputStream
                val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
                conn.disconnect()
                val resp = ApiResponse(code, if (text.isBlank()) JSONObject() else JSONObject(text))
                // LICENCIA: si el servidor responde 402, es error de licencia
                if (code == 402 || resp.body.optBoolean("licenseError")) {
                    _status.value = _status.value.copy(message = "⛔ Licencia no válida: ${resp.error}. Active una licencia.")
                }
                resp
            } catch (e: Exception) {
                ApiResponse(0, JSONObject().put("error", "Sin conexión con el servidor: ${e.message ?: ""}".trim()))
            }
        }

    // ------------------------------------------------------------------ sesión
    /** Inicia sesión en el servidor. Devuelve need2fa=true si hace falta el código de la app autenticadora. */
    suspend fun login(serverUrl: String, username: String, password: String, code: String?): ApiResponse {
        var base = serverUrl.trim().trimEnd('/')
        if (!base.startsWith("http")) base = "https://$base"
        val body = JSONObject().put("username", username.trim()).put("password", password)
        if (!code.isNullOrBlank()) body.put("code", code.trim())
        prefs.edit().remove("token").apply()
        val r = call("/login", "POST", body, base)
        val tok = r.body.optString("token")
        if (r.ok && tok.isNotBlank()) {
            val u = r.body.getJSONObject("user")
            if (prefs.getString("server", "") != base || prefs.getString("user", "") != u.getString("username")) {
                stateFile.delete(); prefs.edit().putInt("version", -1).apply()
            }
            prefs.edit().putString("server", base).putString("token", tok)
                .putString("user", u.getString("username")).putString("role", u.getString("role")).apply()
            _status.value = _status.value.copy(connected = true, server = base, user = u.getString("username"), role = u.getString("role"), message = null)
            pull(force = true)
            start()
        }
        return r
    }

    suspend fun logout() {
        stop()
        if (token() != null) runCatching { flushIfDirty(); call("/logout", "POST", JSONObject()) }
        prefs.edit().remove("token").apply()
        _status.value = _status.value.copy(connected = false, message = null)
    }

    private fun expired(msg: String) {
        stop()
        prefs.edit().remove("token").apply()
        _status.value = _status.value.copy(connected = false, message = msg)
    }

    // ------------------------------------------------------------------ bucles
    @OptIn(FlowPreview::class)
    fun start() {
        if (!isConnected() || jobs.any { it.isActive }) return
        val watcher = scope.launch {
            combine(db.products().observeAll(), db.movements().observeAll(), db.cuadre().observeAll(), db.exchange().observeAll()) { _, _, _, _ -> Unit }
                .debounce(1500)
                .collect { if (!applying) flushIfDirty() }
        }
        val poller = scope.launch {
            if (!stateFile.exists()) pull(force = true)
            while (isActive) {
                delay(15_000)
                val r = call("/state/version")
                if (r.code == 401) { expired("La sesión del servidor caducó. Vuelve a entrar."); break }
                if (r.ok && (r.body.optInt("version") != version() || r.body.optInt("closed") != _status.value.closedDays.size)) {
                    if (localSig() == lastLocalSig) pull()
                }
            }
        }
        jobs = listOf(watcher, poller)
    }

    fun stop() { jobs.forEach { it.cancel() }; jobs = emptyList() }

    fun syncNow() = scope.launch { if (!flushIfDirty()) pull(force = true) }

    private suspend fun flushIfDirty(): Boolean {
        if (!isConnected() || !stateFile.exists()) return false
        return if (localSig() != lastLocalSig) { push(); true } else false
    }

    // ------------------------------------------------------------------ cierre del día e historial
    suspend fun closeDay(date: String, note: String = ""): ApiResponse {
        flushIfDirty()
        val r = call("/days/close", "POST", JSONObject().put("date", date).put("note", note))
        if (r.ok) pull(force = true)
        return r
    }

    suspend fun reopenDay(date: String, reason: String): ApiResponse {
        val r = call("/days/reopen", "POST", JSONObject().put("date", date).put("reason", reason))
        if (r.ok) pull(force = true)
        return r
    }

    data class PriceChange(val date: String, val product: String, val field: String, val old: Double, val new: Double, val user: String)

    /** Historial diario de cambios de precio y comisión (del estado compartido con la Web). */
    fun priceHistory(): List<PriceChange> {
        if (!stateFile.exists()) return emptyList()
        return runCatching {
            JSONObject(stateFile.readText()).optJSONArray("priceHistory").objects().map {
                PriceChange(it.str("date"), it.str("productName"), it.str("field"), it.num("old"), it.num("new"), it.str("userName"))
            }.sortedByDescending { it.date }
        }.getOrDefault(emptyList())
    }

    // ------------------------------------------------------------------ pull
    suspend fun pull(force: Boolean = false): Unit = mutex.withLock {
        if (!isConnected()) return@withLock
        _status.value = _status.value.copy(busy = true)
        val r = call("/state")
        if (r.code == 401) { expired("La sesión del servidor caducó. Vuelve a entrar."); return@withLock }
        if (!r.ok) { _status.value = _status.value.copy(busy = false, message = r.error); return@withLock }
        val ver = r.body.optInt("version")
        val closed = mutableSetOf<String>()
        r.body.optJSONArray("closedDays")?.let { a -> for (i in 0 until a.length()) closed += a.getJSONObject(i).optString("date") }
        val state = r.body.optJSONObject("state")
        if (state == null) {
            _status.value = _status.value.copy(busy = false, message = "El servidor aún no tiene datos: entra primero desde la Web como administrador.")
            return@withLock
        }
        if (!force && ver == version() && closed == _status.value.closedDays) { _status.value = _status.value.copy(busy = false); return@withLock }
        stateFile.writeText(state.toString())
        prefs.edit().putInt("version", ver).apply()
        applyToRoom(state, closed)
        lastLocalSig = localSig()
        _status.value = _status.value.copy(busy = false, version = ver, lastSync = System.currentTimeMillis(), closedDays = closed,
            message = r.body.optString("updatedBy").takeIf { it.isNotBlank() }?.let { "Datos al día (último cambio: $it)" })
    }

    private fun JSONObject.num(k: String) = if (!has(k) || isNull(k)) 0.0 else optDouble(k, 0.0)
    private fun JSONObject.str(k: String) = if (!has(k) || isNull(k)) "" else optString(k, "")
    private fun epoch(date: String) = Dates.startOfDay(LocalDate.parse(date))
    private fun iso(epoch: Long) = Dates.toLocalDate(epoch).toString()
    private fun JSONArray?.objects(): List<JSONObject> = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }

    private suspend fun applyToRoom(state: JSONObject, closed: Set<String>) {
        val me = db.users().byUsername(prefs.getString("user", "") ?: "")?.id ?: 1L
        applying = true
        try {
            db.withTransaction {
                db.movements().deleteAll(); db.products().deleteAll(); db.cuadre().deleteAll(); db.exchange().deleteAll()
                val byRemote = HashMap<String, ProductEntity>()
                for (p in state.optJSONArray("products").objects()) {
                    val e = ProductEntity(
                        active = !isDeleted(p), updatedAt = p.optLong("deletedAt", System.currentTimeMillis()),
                        name = p.str("name"), stockInicial = p.num("stockInicial"), stockActual = p.num("stockActual"),
                        precioVentaUsd = p.num("precioVentaUsd"), comisionCup = p.num("comisionCup"), minStock = p.num("minStock"),
                        category = p.str("category").ifBlank { "General" }, precioCostoUsd = p.num("precioCostoUsd"),
                        precioVenta2Usd = p.num("precioVenta2Usd"), observaciones = p.str("observaciones"), remoteId = p.str("id")
                    )
                    val id = db.products().insert(e)
                    byRemote[e.remoteId!!] = e.copy(id = id)
                }
                val movs = state.optJSONArray("movements").objects()
                    .filter { !isDeleted(it) && byRemote[it.str("productId")]?.active == true }
                    .sortedWith(compareBy({ it.str("date") }, { it.optLong("createdAt") }))
                val running = HashMap<String, Double>()
                val out = ArrayList<MovementEntity>()
                for (m in movs) {
                    val prod = byRemote.getValue(m.str("productId"))
                    val type = MovementType.from(m.str("type"))
                    val qty = m.num("quantity")
                    val ini = running[prod.remoteId!!] ?: prod.stockInicial
                    val fin = StockCalculator.stockFinal(ini, type, qty)
                    running[prod.remoteId] = fin
                    val d = LocalDate.parse(m.str("date"))
                    val unitPrice = m.num("unitPriceUsd")
                    val amount = when {
                        m.has("importedAmountUsd") && !m.isNull("importedAmountUsd") -> m.num("importedAmountUsd")
                        m.has("importeUsd") && !m.isNull("importeUsd") -> m.num("importeUsd")
                        else -> StockCalculator.importeUsd(type, qty, unitPrice)
                    }
                    val commission = when {
                        m.has("importedCommissionCup") && !m.isNull("importedCommissionCup") -> m.num("importedCommissionCup")
                        m.has("comisionCup") && !m.isNull("comisionCup") -> m.num("comisionCup")
                        else -> StockCalculator.comisionVenta(type, qty, prod.comisionCup)
                    }
                    val unitCost = if (m.has("unitCostUsd") && !m.isNull("unitCostUsd")) m.num("unitCostUsd") else prod.precioCostoUsd
                    out += MovementEntity(
                        dateEpoch = Dates.startOfDay(d), weekday = Dates.weekday(d), productId = prod.id, type = type.name, quantity = qty,
                        unitPriceUsd = unitPrice, importeUsd = amount, center = SaleCenter.from(m.str("center")).name,
                        comisionCup = commission, stockInicial = ini, stockFinal = fin, userId = me, notes = m.str("notes"),
                        remoteId = m.str("id"), unitCostUsd = if (type == MovementType.VENTA) unitCost else 0.0
                    )
                }
                db.movements().insertAll(out)
                for (r in state.optJSONArray("rates").objects()) {
                    db.exchange().insert(ExchangeRateEntity(pair = "CUP/" + r.str("currency").ifBlank { "USD" }, rate = r.num("rate"),
                        dateEpoch = epoch(r.str("date")), userId = me, note = r.str("note"), remoteId = r.str("id")))
                }
                for (c in state.optJSONArray("cuadres").objects()) db.cuadre().upsert(cuadreFromJson(c, me, c.str("date") in closed))
            }
        } finally { applying = false }
    }

    private fun cuadreFromJson(c: JSONObject, me: Long, closed: Boolean): DailyCuadreEntity {
        val d = LocalDate.parse(c.str("date"))
        return DailyCuadreEntity(
            dateEpoch = Dates.startOfDay(d), weekday = Dates.weekday(d), cupUsd = c.num("cupUsd").takeIf { it > 0 } ?: 750.0, mxnUsd = 20.0,
            cobroUsd = c.num("usdEfectivo"), cobroZelle = c.num("zelle"), cobroMxn = 0.0, cobroCupEfectivo = c.num("mnEfectivoCup"),
            cobroCupTransf = c.num("mnTarjetaCup"), cobroEuropa = c.num("mlc"), entradaCup = c.num("aumentoFondoCup"), entradaUsd = c.num("aumentoFondoUsd"),
            extraccionCup = c.num("salidaJesusMn"), extraccionUsd = c.num("salidaJesusUsd") + c.num("salidaMlc"),
            fondoInicialCup = c.num("fondoCupEfectivo") + c.num("fondoCupTarjeta"), fondoInicialUsd = c.num("fondoUsd"),
            cambioCup = 0.0, cambioUsd = c.num("gastosCombosUsd"), domicilioCup = c.num("domiciliosCup"), domicilioUsd = 0.0,
            otrosGastosCup = c.num("gastosCup"), otrosGastosUsd = 0.0, otrosGastosObs = "Venta del día: ${c.num("venta")} USD",
            comisionesCup = c.num("comisionesCup"), comisionesUsd = 0.0, closed = closed, userId = me
        )
    }

    /** Firma del contenido sincronizable de Room, para detectar cambios hechos en la App. */
    private suspend fun localSig(): String {
        val sb = StringBuilder()
        db.products().all().sortedBy { it.id }.forEach { sb.append(listOf(it.remoteId, it.name, it.category, it.stockInicial, it.precioVentaUsd, it.precioVenta2Usd, it.precioCostoUsd, it.comisionCup, it.minStock, it.observaciones, it.active).joinToString("|")).append('\n') }
        db.movements().all().forEach { sb.append(listOf(it.remoteId, it.productId, it.dateEpoch, it.type, it.quantity, it.unitPriceUsd, it.unitCostUsd, it.importeUsd, it.comisionCup, it.center, it.notes).joinToString("|")).append('\n') }
        db.cuadre().all().sortedBy { it.dateEpoch }.forEach { sb.append(it.copy(id = 0, userId = 0, closed = false).toString()).append('\n') }
        db.exchange().all().forEach { sb.append(listOf(it.remoteId, it.pair, it.rate, it.dateEpoch).joinToString("|")).append('\n') }
        return sb.toString().hashCode().toString() + ":" + sb.length
    }

    // ------------------------------------------------------------------ push
    private fun newId(prefix: String) = prefix + "_a" + UUID.randomUUID().toString().replace("-", "").take(14)
    private fun isDeleted(o: JSONObject) = o.has("deletedAt") && !o.isNull("deletedAt")

    suspend fun push() {
        val reload = pushLocked()
        if (reload != null) { pull(force = true); _status.value = _status.value.copy(message = reload) }
    }

    /** Devuelve un mensaje si hay que recargar desde el servidor. */
    private suspend fun pushLocked(): String? = mutex.withLock {
        if (!isConnected() || !stateFile.exists()) return@withLock null
        _status.value = _status.value.copy(busy = true)
        val who = prefs.getString("user", "App") ?: "App"
        val now = System.currentTimeMillis()
        val today = LocalDate.now().toString()
        val state = JSONObject(stateFile.readText())
        val changes = mutableListOf<String>()

        // Productos
        val jProducts = state.optJSONArray("products") ?: JSONArray().also { state.put("products", it) }
        val pById = jProducts.objects().associateBy { it.str("id") }
        val history = state.optJSONArray("priceHistory") ?: JSONArray().also { state.put("priceHistory", it) }
        val localProducts = db.products().all()
        var restored = false
        val remoteOfLocal = HashMap<Long, String>()
        for (p in localProducts) {
            val o = p.remoteId?.let { pById[it] }
            if (o == null) {
                val id = newId("p")
                jProducts.put(JSONObject().put("id", id).put("name", p.name).put("category", p.category).put("stockInicial", p.stockInicial)
                    .put("stockActual", p.stockActual).put("precioVentaUsd", p.precioVentaUsd).put("precioVenta2Usd", p.precioVenta2Usd)
                    .put("precioCostoUsd", p.precioCostoUsd).put("comisionCup", p.comisionCup).put("minStock", p.minStock)
                    .put("observaciones", p.observaciones).put("image", JSONObject.NULL).put("deletedAt", JSONObject.NULL).put("createdAt", now).put("updatedAt", now))
                db.products().setRemoteId(p.id, id); remoteOfLocal[p.id] = id; changes += "nuevo producto ${p.name}"
                continue
            }
            remoteOfLocal[p.id] = p.remoteId!!
            if (!p.active && !isDeleted(o)) {
                o.put("deletedAt", now).put("deletedBy", "$who (App)")
                for (m in (state.optJSONArray("movements")).objects()) if (m.str("productId") == p.remoteId && !isDeleted(m)) m.put("deletedAt", now).put("deletedWith", p.remoteId)
                changes += "papelera ${p.name}"; continue
            }
            if (p.active && isDeleted(o)) {
                o.put("deletedAt", JSONObject.NULL)
                for (m in (state.optJSONArray("movements")).objects()) if (m.optString("deletedWith") == p.remoteId) { m.put("deletedAt", JSONObject.NULL); m.remove("deletedWith") }
                restored = true; changes += "restaurado ${p.name}"; continue
            }
            if (!p.active) continue
            var changed = false
            fun set(k: String, v: Any) {
                val diff = if (v is Double) o.num(k) != v else o.str(k) != v.toString()
                if (diff) { o.put(k, v); changed = true }
            }
            for ((field, v) in listOf("precioVentaUsd" to p.precioVentaUsd, "precioVenta2Usd" to p.precioVenta2Usd, "precioCostoUsd" to p.precioCostoUsd, "comisionCup" to p.comisionCup)) {
                if (o.num(field) != v) {
                    history.put(JSONObject().put("id", newId("h")).put("date", today).put("ts", now).put("productId", p.remoteId).put("productName", p.name)
                        .put("field", field).put("old", o.num(field)).put("new", v).put("userName", "$who (App)"))
                }
            }
            set("name", p.name); set("category", p.category); set("stockInicial", p.stockInicial)
            // El stock actual solo lo sube quien puede mover inventario (el Económico no puede tocar productos en el servidor)
            if (prefs.getString("role", "") != "ECONOMICO" && kotlin.math.abs(o.num("stockActual") - p.stockActual) > 1e-6) { o.put("stockActual", p.stockActual); changed = true }
            set("precioVentaUsd", p.precioVentaUsd); set("precioVenta2Usd", p.precioVenta2Usd); set("precioCostoUsd", p.precioCostoUsd)
            set("comisionCup", p.comisionCup); set("minStock", p.minStock); set("observaciones", p.observaciones)
            if (changed) { o.put("updatedAt", now); changes += "producto ${p.name}" }
        }
        // Productos que ya no existen en el teléfono = eliminados definitivamente (con sus movimientos)
        val liveRemote = remoteOfLocal.values.toSet()
        val purged = jProducts.objects().filter { it.str("id") !in liveRemote }.map { it.str("id") }.toSet()
        val trashed = localProducts.filter { !it.active }.mapNotNull { it.remoteId }.toSet()
        if (purged.isNotEmpty()) {
            val keepP = JSONArray(); jProducts.objects().filter { it.str("id") !in purged }.forEach { keepP.put(it) }; state.put("products", keepP)
            val keepM = JSONArray(); (state.optJSONArray("movements")).objects().filter { it.str("productId") !in purged }.forEach { keepM.put(it) }; state.put("movements", keepM)
            changes += "${purged.size} producto(s) eliminados definitivamente"
        }

        // Movimientos
        val jMovs = state.optJSONArray("movements") ?: JSONArray().also { state.put("movements", it) }
        val trashedOrPurged = trashed + purged
        val mById = jMovs.objects().associateBy { it.str("id") }
        val nameOf = localProducts.associate { it.id to it.name }
        val liveMovs = mutableSetOf<String>()
        for (m in db.movements().all()) {
            val pid = remoteOfLocal[m.productId] ?: continue
            val date = iso(m.dateEpoch)
            val o = m.remoteId?.let { mById[it] }
            if (o == null) {
                val id = newId("m")
                jMovs.put(JSONObject().put("id", id).put("date", date).put("productId", pid).put("productName", nameOf[m.productId])
                    .put("type", m.type).put("quantity", m.quantity).put("unitPriceUsd", m.unitPriceUsd).put("unitCostUsd", m.unitCostUsd)
                    .put("importedAmountUsd", m.importeUsd).put("importedCommissionCup", m.comisionCup).put("center", m.center)
                    .put("domicilioCup", 0).put("notes", m.notes).put("userName", "$who (App)").put("createdAt", now).put("deletedAt", JSONObject.NULL))
                db.movements().setRemoteId(m.id, id); liveMovs += id; changes += "movimiento ${m.type} ${m.quantity} × ${nameOf[m.productId]}"
                continue
            }
            liveMovs += m.remoteId!!
            val same = o.str("date") == date && o.str("productId") == pid && MovementType.from(o.str("type")).name == m.type &&
                o.num("quantity") == m.quantity && o.num("unitPriceUsd") == m.unitPriceUsd && o.num("unitCostUsd") == m.unitCostUsd &&
                o.num("importedAmountUsd") == m.importeUsd && o.num("importedCommissionCup") == m.comisionCup &&
                SaleCenter.from(o.str("center")).name == m.center && o.str("notes") == m.notes
            if (!same) {
                o.put("date", date).put("productId", pid).put("productName", nameOf[m.productId]).put("type", m.type).put("quantity", m.quantity)
                    .put("unitPriceUsd", m.unitPriceUsd).put("unitCostUsd", m.unitCostUsd)
                    .put("importedAmountUsd", m.importeUsd).put("importedCommissionCup", m.comisionCup)
                    .put("notes", m.notes).put("updatedAt", now).put("updatedBy", "$who (App)")
                if (SaleCenter.from(o.str("center")).name != m.center) o.put("center", m.center)
                changes += "movimiento modificado"
            }
        }
        for (o in jMovs.objects()) if (!isDeleted(o) && o.str("id") !in liveMovs && o.str("productId") !in trashedOrPurged) {
            o.put("deletedAt", now); changes += "movimiento a papelera"
        }

        // Tasas (el historial solo crece)
        val jRates = state.optJSONArray("rates") ?: JSONArray().also { state.put("rates", it) }
        for (r in db.exchange().all()) if (r.remoteId.isNullOrBlank()) {
            val id = newId("r")
            jRates.put(JSONObject().put("id", id).put("date", iso(r.dateEpoch)).put("currency", r.pair.substringAfter("/"))
                .put("rate", r.rate).put("note", r.note.ifBlank { "Desde la App" }).put("userName", "$who (App)").put("createdAt", now))
            db.exchange().setRemoteId(r.id, id); changes += "tasa ${r.pair} ${r.rate}"
        }

        // Cuadres: se escriben solo los campos que la App conoce
        val jCuadres = state.optJSONArray("cuadres") ?: JSONArray().also { state.put("cuadres", it) }
        val cByDate = jCuadres.objects().associateBy { it.str("date") }
        for (c in db.cuadre().all()) {
            val date = iso(c.dateEpoch)
            val o = cByDate[date]
            if (o != null && cuadreFromJson(o, c.userId, c.closed).copy(id = c.id) == c) continue
            val t = o ?: JSONObject().put("id", newId("c")).put("date", date).also { jCuadres.put(it) }
            val tarjeta = t.num("fondoCupTarjeta")
            t.put("cupUsd", c.cupUsd).put("usdEfectivo", c.cobroUsd).put("zelle", c.cobroZelle).put("mnEfectivoCup", c.cobroCupEfectivo)
                .put("mnTarjetaCup", c.cobroCupTransf).put("mlc", c.cobroEuropa).put("aumentoFondoCup", c.entradaCup).put("aumentoFondoUsd", c.entradaUsd)
                .put("salidaJesusMn", c.extraccionCup).put("salidaJesusUsd", c.extraccionUsd - t.num("salidaMlc"))
                .put("fondoCupEfectivo", c.fondoInicialCup - tarjeta).put("fondoCupTarjeta", tarjeta).put("fondoUsd", c.fondoInicialUsd)
                .put("gastosCombosUsd", c.cambioUsd).put("domiciliosCup", c.domicilioCup).put("gastosCup", c.otrosGastosCup)
                .put("comisionesCup", c.comisionesCup).put("imported", false).put("updatedBy", "$who (App)")
            changes += "cuadre $date"
        }

        if (changes.isEmpty()) { lastLocalSig = localSig(); _status.value = _status.value.copy(busy = false); return@withLock null }
        val audit = state.optJSONArray("audit") ?: JSONArray().also { state.put("audit", it) }
        val entry = JSONObject().put("id", newId("a")).put("userName", who).put("action", "APP_SYNC").put("entity", "app")
            .put("details", "Desde Android: " + changes.take(8).joinToString(", ") + if (changes.size > 8) " (+${changes.size - 8})" else "").put("timestamp", now)
        val newAudit = JSONArray().put(entry); for (i in 0 until audit.length()) newAudit.put(audit.get(i)); state.put("audit", newAudit)

        val r = call("/state", "PUT", JSONObject().put("version", version()).put("state", state))
        return@withLock when {
            r.ok -> {
                stateFile.writeText(state.toString())
                prefs.edit().putInt("version", r.body.optInt("version")).apply()
                lastLocalSig = localSig()
                _status.value = _status.value.copy(busy = false, version = r.body.optInt("version"), lastSync = now, message = "Guardado en el servidor ✔")
                if (restored) "Producto restaurado con sus movimientos" else null
            }
            r.code == 401 -> { expired("La sesión del servidor caducó. Vuelve a entrar."); null }
            r.code == 0 -> { _status.value = _status.value.copy(busy = false, message = "Sin conexión: se reintentará."); null }
            // 409 conflicto · 403 permiso del rol · 423 día cerrado → se descartan los cambios locales y se recarga
            else -> { _status.value = _status.value.copy(busy = false); r.error }
        }
    }
}
