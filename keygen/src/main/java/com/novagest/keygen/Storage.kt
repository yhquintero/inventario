package com.novagest.keygen

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

/**
 * El secreto de firma es lo más sensible de esta herramienta: quien lo tenga puede emitir
 * licencias. Se guarda cifrado con una clave del Keystore del teléfono, nunca en el APK
 * ni en preferencias en claro.
 */
class SecretStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "keygen_secret",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun load(): String? = prefs.getString("secret", null)?.takeIf { it.isNotBlank() }

    fun save(secret: String) {
        prefs.edit().putString("secret", secret.trim()).apply()
    }

    fun clear() {
        prefs.edit().remove("secret").apply()
    }
}

/** Clave ya emitida, para no tener que volver a generarla si el cliente la pierde. */
data class HistoryItem(
    val at: Long,
    val client: String,
    val type: String,
    val expiresAt: Long,
    val key: String
) {
    fun expiresText(): String =
        if (expiresAt == 0L) "Permanente"
        else java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
            .format(java.util.Date(expiresAt * 1000))
}

class HistoryStore(context: Context) {
    private val prefs = context.getSharedPreferences("keygen_history", Context.MODE_PRIVATE)

    fun all(): List<HistoryItem> = runCatching {
        val arr = JSONArray(prefs.getString("items", "[]") ?: "[]")
        (0 until arr.length()).mapNotNull { i ->
            arr.optJSONObject(i)?.let {
                HistoryItem(
                    at = it.optLong("at"),
                    client = it.optString("client"),
                    type = it.optString("type"),
                    expiresAt = it.optLong("expiresAt"),
                    key = it.optString("key")
                )
            }
        }
    }.getOrDefault(emptyList())

    fun add(item: HistoryItem) {
        save((listOf(item) + all()).take(100))
    }

    /** Borra una sola clave del historial (por su token), sin tocar las demás. */
    fun remove(key: String) {
        save(all().filterNot { it.key == key })
    }

    fun clear() {
        prefs.edit().remove("items").apply()
    }

    private fun save(items: List<HistoryItem>) {
        val arr = JSONArray()
        items.forEach { i ->
            arr.put(
                JSONObject()
                    .put("at", i.at)
                    .put("client", i.client)
                    .put("type", i.type)
                    .put("expiresAt", i.expiresAt)
                    .put("key", i.key)
            )
        }
        prefs.edit().putString("items", arr.toString()).apply()
    }
}
