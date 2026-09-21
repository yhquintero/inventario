package com.cuadrepinar.inventario.data.backup

import android.content.Context
import com.cuadrepinar.inventario.data.local.AppDatabase
import com.cuadrepinar.inventario.data.local.entity.BackupEntity
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.UserAccount
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BackupManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val db: AppDatabase
) {
    private fun dir() = File(context.filesDir, "backups").apply { mkdirs() }

    suspend fun create(actor: UserAccount, automatic: Boolean, passphrase: String = "CuadrePinar"): AppResult<File> {
        return try {
            val payload = JSONObject().apply {
                put("version", 1)
                put("createdAt", System.currentTimeMillis())
                put("products", arr(db.products().all()) { p ->
                    JSONObject().put("id", p.id).put("name", p.name).put("stockInicial", p.stockInicial)
                        .put("stockActual", p.stockActual).put("precioVentaUsd", p.precioVentaUsd)
                        .put("comisionCup", p.comisionCup).put("minStock", p.minStock)
                        .put("active", p.active).put("category", p.category).put("notes", p.notes)
                })
                put("movements", arr(db.movements().all()) { m ->
                    JSONObject().put("id", m.id).put("dateEpoch", m.dateEpoch).put("weekday", m.weekday)
                        .put("productId", m.productId).put("type", m.type).put("quantity", m.quantity)
                        .put("unitPriceUsd", m.unitPriceUsd).put("importeUsd", m.importeUsd)
                        .put("center", m.center).put("comisionCup", m.comisionCup)
                        .put("stockInicial", m.stockInicial).put("stockFinal", m.stockFinal)
                        .put("userId", m.userId).put("notes", m.notes)
                })
                put("cuadres", arr(db.cuadre().all()) { c -> JSONObject().put("id", c.id).put("dateEpoch", c.dateEpoch).put("payload", c.toString()) })
                put("users", arr(db.users().all()) { u ->
                    JSONObject().put("id", u.id).put("username", u.username).put("displayName", u.displayName)
                        .put("email", u.email).put("passwordHash", u.passwordHash).put("salt", u.salt)
                        .put("role", u.role).put("active", u.active)
                })
                put("audit", arr(db.audit().all()) { a ->
                    JSONObject().put("userId", a.userId).put("action", a.action).put("details", a.details).put("timestamp", a.timestamp)
                })
            }.toString()
            val encrypted = encrypt(payload.toByteArray(Charsets.UTF_8), passphrase)
            val file = File(dir(), "backup_${System.currentTimeMillis()}.cpbak")
            file.writeBytes(encrypted)
            db.backups().insert(
                BackupEntity(
                    createdAt = System.currentTimeMillis(),
                    automatic = automatic,
                    path = file.absolutePath,
                    sizeBytes = file.length(),
                    note = "Creada por ${actor.username}"
                )
            )
            AppResult.Ok(file)
        } catch (e: Exception) {
            AppResult.Err(e.message ?: "No se pudo crear la copia.")
        }
    }

    fun listFiles(): List<File> = dir().listFiles()?.sortedByDescending { it.lastModified() }?.toList() ?: emptyList()

    private fun <T> arr(list: List<T>, map: (T) -> JSONObject): JSONArray {
        val a = JSONArray()
        list.forEach { a.put(map(it)) }
        return a
    }

    private fun encrypt(data: ByteArray, passphrase: String): ByteArray {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val key = derive(passphrase, salt)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(data)
        return "CPB1".toByteArray() + salt + iv + encrypted
    }

    private fun derive(pass: String, salt: ByteArray): SecretKeySpec {
        val spec = PBEKeySpec(pass.toCharArray(), salt, 80_000, 256)
        val bytes = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        return SecretKeySpec(bytes, "AES")
    }
}
