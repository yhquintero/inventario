package com.novagest.inventario.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Licencia de Uso - NovaGest Android
 * Verifica SIEMPRE PRIMERO la licencia antes de permitir acceso a cualquier App.
 * - Almacenamiento cifrado con EncryptedSharedPreferences
 * - Verificación remota contra /api/license/status y /api/license/activate
 * - Verificación local de expiración
 * - Bloqueo total sin licencia válida
 */

data class LicenseStatus(
    val valid: Boolean = false,
    val hasLicense: Boolean = false,
    val clientName: String = "",
    val product: String = "",
    val type: String = "",
    val issuedAt: Long = 0L,
    val expiresAt: Long = 0L,
    val daysLeft: Long = -1L,
    val maxUsers: Int = 0,
    val maxDevices: Int = 0,
    val licenseId: String = "",
    val reason: String = "",
    val offline: Boolean = false,
    /** Número WhatsApp para solicitar la licencia (configurable en el servidor); vacío = elegir contacto. */
    val whatsapp: String = "",
    val terms: List<LicenseTerm> = emptyList()
) {
    val isExpiringSoon: Boolean get() = valid && daysLeft in 0..7
    val isPermanent: Boolean get() = expiresAt == 0L
    fun expiresText(): String {
        if (isPermanent) return "Permanente"
        if (expiresAt == 0L) return "—"
        val d = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date(expiresAt * 1000))
        return if (daysLeft >= 0) "$d (${daysLeft}d restantes)" else d
    }
}

/** Plazo de licencia elegible al solicitarla por WhatsApp (como en DrywallMaterialsCalculator). */
data class LicenseTerm(val id: String, val label: String, val days: Int, val type: String)

@Singleton
class LicenseManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "license_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun getCached(): LicenseStatus? {
        if (!prefs.contains("valid")) return null
        return try {
            LicenseStatus(
                valid = prefs.getBoolean("valid", false),
                hasLicense = prefs.getBoolean("hasLicense", false),
                clientName = prefs.getString("clientName", "") ?: "",
                product = prefs.getString("product", "") ?: "",
                type = prefs.getString("type", "") ?: "",
                issuedAt = prefs.getLong("issuedAt", 0L),
                expiresAt = prefs.getLong("expiresAt", 0L),
                daysLeft = prefs.getLong("daysLeft", -1L),
                maxUsers = prefs.getInt("maxUsers", 0),
                maxDevices = prefs.getInt("maxDevices", 0),
                licenseId = prefs.getString("licenseId", "") ?: "",
                reason = prefs.getString("reason", "") ?: "",
                offline = false
            )
        } catch {
            null
        }
    }

    private fun saveCache(status: LicenseStatus) {
        prefs.edit()
            .putBoolean("valid", status.valid)
            .putBoolean("hasLicense", status.hasLicense)
            .putString("clientName", status.clientName)
            .putString("product", status.product)
            .putString("type", status.type)
            .putLong("issuedAt", status.issuedAt)
            .putLong("expiresAt", status.expiresAt)
            .putLong("daysLeft", status.daysLeft)
            .putInt("maxUsers", status.maxUsers)
            .putInt("maxDevices", status.maxDevices)
            .putString("licenseId", status.licenseId)
            .putString("reason", status.reason)
            .putLong("checkedAt", System.currentTimeMillis())
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun deviceId(): String {
        var id = prefs.getString("device_id", null)
        if (id == null) {
            id = "android-" + java.util.UUID.randomUUID().toString().take(8)
            prefs.edit().putString("device_id", id).apply()
        }
        return id
    }

    /**
     * Verifica estado de licencia contra el servidor.
     * Es la fuente de verdad - sin licencia válida no hay acceso.
     */
    suspend fun fetchStatus(serverBase: String): LicenseStatus = withContext(Dispatchers.IO) {
        if (serverBase.isBlank()) {
            // Sin servidor configurado: usa caché local si existe y no expiró
            val cached = getCached()
            if (cached != null && cached.valid) {
                val nowSec = System.currentTimeMillis() / 1000
                if (cached.expiresAt == 0L || cached.expiresAt > nowSec) {
                    return@withContext cached.copy(offline = true)
                }
            }
            return@withContext LicenseStatus(valid = false, hasLicense = cached != null, reason = "Sin servidor configurado. Configure el servidor para validar la licencia.", offline = true)
        }
        try {
            val url = URL(serverBase.trimEnd('/') + "/api/license/status")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 10000
            conn.setRequestProperty("X-CP", "1")
            conn.setRequestProperty("Accept", "application/json")
            val code = conn.responseCode
            val text = (if (code >= 400) conn.errorStream else conn.inputStream)?.bufferedReader()?.readText().orEmpty()
            conn.disconnect()
            if (code == 200) {
                val json = JSONObject(text)
                val valid = json.optBoolean("valid", false)
                val status = if (valid) {
                    LicenseStatus(
                        valid = true,
                        hasLicense = true,
                        clientName = json.optString("clientName"),
                        product = json.optString("product"),
                        type = json.optString("type"),
                        issuedAt = json.optLong("issuedAt"),
                        expiresAt = json.optLong("expiresAt"),
                        daysLeft = json.optLong("daysLeft", -1L),
                        maxUsers = json.optInt("maxUsers"),
                        maxDevices = json.optInt("maxDevices"),
                        licenseId = json.optString("licenseId"),
                        reason = "",
                        whatsapp = json.optString("whatsapp"),
                        terms = parseTerms(json)
                    )
                } else {
                    LicenseStatus(
                        valid = false,
                        hasLicense = json.optBoolean("hasLicense", false),
                        reason = json.optString("reason", "Licencia no válida"),
                        offline = false
                    )
                }
                if (valid) saveCache(status)
                return@withContext status
            } else {
                return@withContext LicenseStatus(valid = false, hasLicense = false, reason = "Error del servidor: $code", offline = false)
            }
        } catch (e: Exception) {
            val cached = getCached()
            if (cached != null && cached.valid) {
                val nowSec = System.currentTimeMillis() / 1000
                if (cached.expiresAt == 0L || cached.expiresAt > nowSec) {
                    return@withContext cached.copy(offline = true)
                }
            }
            return@withContext LicenseStatus(valid = false, hasLicense = cached != null, reason = "Sin conexión: ${e.message}", offline = true)
        }
    }

    /**
     * Activa licencia en el servidor.
     */
    suspend fun activate(serverBase: String, licenseKey: String): Result<LicenseStatus> = withContext(Dispatchers.IO) {
        if (serverBase.isBlank()) {
            return@withContext Result.failure(Exception("Configure el servidor primero."))
        }
        try {
            val url = URL(serverBase.trimEnd('/') + "/api/license/activate")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 10000
            conn.readTimeout = 15000
            conn.doOutput = true
            conn.setRequestProperty("X-CP", "1")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            val body = JSONObject()
                .put("license_key", licenseKey.trim())
                .put("device_id", deviceId())
                .put("device_info", "Android App ${android.os.Build.MODEL} ${android.os.Build.VERSION.RELEASE}")
                .toString()
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val text = (if (code >= 400) conn.errorStream else conn.inputStream)?.bufferedReader()?.readText().orEmpty()
            conn.disconnect()
            val json = try { JSONObject(text) } catch { JSONObject() }
            if (code == 200 && json.optBoolean("ok", false)) {
                val status = LicenseStatus(
                    valid = true,
                    hasLicense = true,
                    clientName = json.optString("clientName"),
                    product = json.optString("product"),
                    type = json.optString("type"),
                    issuedAt = 0L,
                    expiresAt = json.optLong("expiresAt"),
                    daysLeft = json.optLong("daysLeft", -1L),
                    maxUsers = 0,
                    maxDevices = 0,
                    licenseId = json.optString("licenseId"),
                    reason = ""
                )
                saveCache(status)
                return@withContext Result.success(status)
            } else {
                val err = json.optString("error", "Clave no válida")
                return@withContext Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            return@withContext Result.failure(Exception("Sin conexión: ${e.message}"))
        }
    }

    /**
     * Verificación local rápida sin red: solo expiración.
     */
    fun isLocallyValid(): Boolean {
        val cached = getCached() ?: return false
        if (!cached.valid) return false
        if (cached.expiresAt == 0L) return true
        return cached.expiresAt > System.currentTimeMillis() / 1000
    }

    private fun parseTerms(json: JSONObject): List<LicenseTerm> {
        val arr = json.optJSONArray("terms") ?: return DEFAULT_TERMS
        if (arr.length() == 0) return DEFAULT_TERMS
        return (0 until arr.length()).mapNotNull { i ->
            arr.optJSONObject(i)?.let { LicenseTerm(it.optString("id"), it.optString("label"), it.optInt("days"), it.optString("type")) }
        }.ifEmpty { DEFAULT_TERMS }
    }

    /** Mensaje de solicitud de licencia por término, listo para WhatsApp (mismo formato que la Web). */
    fun licenseRequestMessage(name: String, term: LicenseTerm): String {
        val fecha = java.text.SimpleDateFormat("dd/MM/yyyy, h:mm:ss a", java.util.Locale("es", "CU"))
            .format(java.util.Date())
            .replace("a. m.", "a.m.")
            .replace("p. m.", "p.m.")
        val plazo = if (term.days > 0) "${term.label} (${term.days} días) · ${term.type}" else "${term.label} · ${term.type}"
        return listOf(
            "Hola, solicito activar mi Licencia de NovaGest.",
            "",
            "👤 Usuario: $name",
            "🆔 ID Dispositivo: ${deviceId()}",
            "📦 Producto: NovaGest v1.0.0",
            "📅 Plan: $plazo",
            "🕒 Fecha Actual: $fecha"
        ).joinToString("\n")
    }

    /**
     * Registra la solicitud en el servidor para que el administrador la vea en
     * «Gestionar → Solicitudes» (Web). El envío por WhatsApp no depende de esto:
     * si no hay conexión, la solicitud se envía igual.
     */
    suspend fun submitRequest(serverBase: String, name: String, phone: String, term: LicenseTerm): Result<String> = withContext(Dispatchers.IO) {
        if (serverBase.isBlank()) return@withContext Result.failure(Exception("Sin servidor configurado."))
        try {
            val url = URL(serverBase.trimEnd('/') + "/api/license/request")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 10000
            conn.doOutput = true
            conn.setRequestProperty("X-CP", "1")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            val body = JSONObject()
                .put("client_name", name.trim())
                .put("device_id", deviceId())
                .put("device_info", "Android App ${android.os.Build.MODEL} ${android.os.Build.VERSION.RELEASE}")
                .put("phone", phone.trim())
                .put("term", term.id)
                .put("channel", "android")
                .put("product", "NovaGest")
                .put("version", "1.0.0")
                .toString()
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val text = (if (code >= 400) conn.errorStream else conn.inputStream)?.bufferedReader()?.readText().orEmpty()
            conn.disconnect()
            val json = try { JSONObject(text) } catch { JSONObject() }
            if (code == 200 && json.optBoolean("ok", false)) {
                Result.success(json.optInt("id", 0).toString())
            } else {
                Result.failure(Exception(json.optString("error", "No se pudo registrar la solicitud ($code)")))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Sin conexión: ${e.message}"))
        }
    }

    /** URL de WhatsApp: con número configurado (wa.me) o sin número (elegir contacto). */
    fun whatsappLicenseUrl(name: String, term: LicenseTerm, whatsapp: String): String {
        val text = java.net.URLEncoder.encode(licenseRequestMessage(name, term), "UTF-8")
        val number = whatsapp.filter { it.isDigit() }
        return if (number.isNotBlank()) "https://wa.me/$number?text=$text"
        else "https://api.whatsapp.com/send?text=$text"
    }

    companion object {
        val DEFAULT_TERMS = listOf(
            LicenseTerm("DIA", "1 día", 1, "FULL"),
            LicenseTerm("SEMANA", "1 semana", 7, "FULL"),
            LicenseTerm("MES", "1 mes", 30, "FULL"),
            LicenseTerm("TRIMESTRE", "3 meses", 90, "FULL"),
            LicenseTerm("SEMESTRE", "6 meses", 180, "FULL"),
            LicenseTerm("ANIO", "1 año", 365, "FULL"),
            LicenseTerm("DOS_ANIOS", "2 años", 730, "FULL"),
            LicenseTerm("PERMANENTE", "Permanente", 0, "LIFETIME")
        )
    }
}
