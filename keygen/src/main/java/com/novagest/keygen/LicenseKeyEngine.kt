package com.novagest.keygen

import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Base64
import java.util.Date
import java.util.Locale
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** Plazo de licencia: mismos identificadores, etiquetas y días que tools/generate_license.py. */
data class LicenseTerm(val id: String, val label: String, val days: Int, val type: String)

/** Contenido que se firma dentro de la clave. */
data class LicensePayload(
    val licenseId: String,
    val clientName: String,
    val product: String,
    val type: String,
    val issuedAt: Long,
    val expiresAt: Long,
    val maxUsers: Int,
    val maxDevices: Int,
    val features: List<String>
) {
    val isPermanent: Boolean get() = expiresAt == 0L

    fun expiresText(): String =
        if (isPermanent) "Permanente" else FMT.format(Date(expiresAt * 1000))

    fun daysLeft(nowSec: Long = System.currentTimeMillis() / 1000): Long =
        if (isPermanent) -1 else (expiresAt - nowSec) / 86_400

    companion object {
        private val FMT = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    }
}

/**
 * Emisión y verificación de claves de licencia.
 *
 * El formato es exactamente el del servidor (novagest_server.py · create_license_token):
 *   payload_json  = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
 *   b64           = base64url(payload_json)  sin relleno
 *   sig           = base64url(HMAC_SHA256(secreto, b64))  sin relleno
 *   clave         = "NG-" + b64 + "." + sig
 *
 * Si esto se separa un byte del original, el servidor rechaza la licencia.
 */
object LicenseKeyEngine {

    val TERMS = listOf(
        LicenseTerm("DIA", "1 día", 1, "FULL"),
        LicenseTerm("SEMANA", "1 semana", 7, "FULL"),
        LicenseTerm("MES", "1 mes", 30, "FULL"),
        LicenseTerm("TRIMESTRE", "3 meses", 90, "FULL"),
        LicenseTerm("SEMESTRE", "6 meses", 180, "FULL"),
        LicenseTerm("ANIO", "1 año", 365, "FULL"),
        LicenseTerm("DOS_ANIOS", "2 años", 730, "FULL"),
        LicenseTerm("PERMANENTE", "Permanente", 0, "LIFETIME")
    )

    val TYPES = listOf("TRIAL", "FULL", "ENTERPRISE", "LIFETIME")

    private val random = SecureRandom()

    /** Igual que secrets.token_hex(8).upper(): 16 caracteres hexadecimales. */
    fun newLicenseId(): String {
        val bytes = ByteArray(8)
        random.nextBytes(bytes)
        // and 0xFF: en Java un byte negativo formateado con %X daría 8 caracteres (FFFFFFFF).
        return bytes.joinToString("") { "%02X".format(it.toInt() and 0xFF) }
    }

    fun newPayload(
        clientName: String,
        product: String,
        term: LicenseTerm,
        type: String,
        maxUsers: Int,
        maxDevices: Int,
        features: List<String>,
        now: Long = System.currentTimeMillis() / 1000
    ): LicensePayload = LicensePayload(
        licenseId = newLicenseId(),
        clientName = clientName.trim().ifBlank { "NovaGest" },
        product = product.trim().ifBlank { "NovaGest" },
        type = type,
        issuedAt = now,
        expiresAt = if (term.days == 0) 0L else now + term.days * 86_400L,
        maxUsers = maxUsers,
        maxDevices = maxDevices,
        features = features.ifEmpty { listOf("*") }
    )

    /**
     * Interpreta el secreto como lo hace el servidor: si el texto es base64url que decodifica
     * a 32 bytes se usan esos bytes; en caso contrario, el texto en UTF-8 tal cual.
     */
    fun secretBytes(input: String): ByteArray {
        val raw = input.trim()
        require(raw.isNotEmpty()) { "El secreto de firma está vacío." }
        val padded = if (raw.length % 4 == 0) raw else raw + "=".repeat(4 - raw.length % 4)
        val decoded = runCatching { Base64.getUrlDecoder().decode(padded) }.getOrNull()
        return if (decoded != null && decoded.size == 32) decoded else raw.toByteArray(Charsets.UTF_8)
    }

    /** Clave lista para entregar al cliente (con el prefijo NG-). */
    fun createKey(payload: LicensePayload, secret: ByteArray): String = "NG-" + createToken(payload, secret)

    fun createToken(payload: LicensePayload, secret: ByteArray): String {
        val b64 = b64url(payload.toJson().toByteArray(Charsets.UTF_8))
        return "$b64.${sign(b64, secret)}"
    }

    /** Comprueba la firma y devuelve el contenido. No valida la fecha: eso lo decide quien llama. */
    fun verify(rawKey: String, secret: ByteArray): Result<LicensePayload> = runCatching {
        var t = rawKey.filterNot { it.isWhitespace() }
        if (t.startsWith("NG-", ignoreCase = true)) t = t.substring(3)
        else if (t.startsWith("CP-", ignoreCase = true)) t = t.substring(3)

        val dot = t.lastIndexOf('.')
        require(dot > 0) { "La clave no tiene el formato esperado (falta el punto entre datos y firma)." }

        val b64 = t.substring(0, dot).filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        val sig = t.substring(dot + 1).filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        require(b64.isNotEmpty() && sig.isNotEmpty()) { "La clave está incompleta." }

        val expected = sign(b64, secret)
        require(MessageDigest.isEqual(expected.toByteArray(), sig.toByteArray())) {
            "La firma no coincide: esta clave no se emitió con el secreto cargado."
        }

        val json = String(b64urlDecode(b64), Charsets.UTF_8)
        val o = JSONObject(json)
        LicensePayload(
            licenseId = o.optString("license_id"),
            clientName = o.optString("client_name"),
            product = o.optString("product"),
            type = o.optString("type"),
            issuedAt = o.optLong("issued_at"),
            expiresAt = o.optLong("expires_at"),
            maxUsers = o.optInt("max_users"),
            maxDevices = o.optInt("max_devices"),
            features = o.optJSONArray("features")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: listOf("*")
        )
    }

    /** Mensaje para enviar la clave al cliente por WhatsApp. */
    fun whatsappMessage(key: String, payload: LicensePayload, term: LicenseTerm): String = buildString {
        appendLine("🔐 Tu Licencia de NovaGest ya está lista.")
        appendLine()
        appendLine("👤 Usuario: ${payload.clientName}")
        appendLine("📅 Plan: ${term.label} · ${payload.type}")
        appendLine("⏳ Vigencia: ${payload.expiresText()}")
        appendLine()
        appendLine("Pega esta clave en la App en «Licencia de uso → Activar licencia»:")
        appendLine()
        append(key)
    }

    // ---------------------------------------------------------------- interno

    /**
     * JSON idéntico a json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False):
     * claves en orden alfabético, sin espacios y con los caracteres no ASCII intactos.
     */
    private fun LicensePayload.toJson(): String = buildString {
        append("{\"client_name\":").append(quote(clientName))
        append(",\"expires_at\":").append(expiresAt)
        append(",\"features\":[").append(features.joinToString(",") { quote(it) }).append(']')
        append(",\"issued_at\":").append(issuedAt)
        append(",\"license_id\":").append(quote(licenseId))
        append(",\"max_devices\":").append(maxDevices)
        append(",\"max_users\":").append(maxUsers)
        append(",\"product\":").append(quote(product))
        append(",\"type\":").append(quote(type))
        append(",\"version\":1}")
    }

    private fun quote(s: String): String = buildString {
        append('"')
        for (c in s) {
            when {
                c == '"' -> append("\\\"")
                c == '\\' -> append("\\\\")
                c == '\n' -> append("\\n")
                c == '\r' -> append("\\r")
                c == '\t' -> append("\\t")
                c == '\b' -> append("\\b")
                c == '\u000C' -> append("\\f")
                c < ' ' -> append("\\u%04x".format(c.code))
                else -> append(c)
            }
        }
        append('"')
    }

    private fun sign(b64: String, secret: ByteArray): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret, "HmacSHA256"))
        return b64url(mac.doFinal(b64.toByteArray(Charsets.UTF_8)))
    }

    private fun b64url(bytes: ByteArray): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private fun b64urlDecode(s: String): ByteArray {
        val padded = if (s.length % 4 == 0) s else s + "=".repeat(4 - s.length % 4)
        return Base64.getUrlDecoder().decode(padded)
    }
}
