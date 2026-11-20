package com.novagest.inventario.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * H4 (auditoría 2026): clave AES-256 para la base de datos local cifrada con SQLCipher.
 *
 * Se genera una passphrase aleatoria de 32 bytes la primera vez, se cifra con una clave del
 * Android Keystore (hardware-backed cuando el dispositivo lo soporta) y se guarda el ciphertext + IV
 * en SharedPreferences. En arranques posteriores, se descifra la misma passphrase usando el Keystore.
 */
object DatabaseKey {

    private const val ALIAS = "novagest_db_key"
    private const val PREFS_NAME = "novagest_db_key_prefs"
    private const val KEY_IV = "iv"

    private fun keystore(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    private fun getOrCreateKeystoreKey(): SecretKey {
        val ks = keystore()
        try {
            (ks.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        } catch (_: Exception) {
            runCatching { ks.deleteEntry(ALIAS) }
        }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    /** Passphrase determinista y persistente para SQLCipher. */
    @Synchronized
    fun passphrase(context: Context): ByteArray {
        val ivBase64 = prefs.getString(KEY_IV, null)

        val masterKey = try { getOrCreateKeystoreKey() } catch (e: Exception) {
            throw IllegalStateException("No se puede acceder a la clave segura de esta base. No se han borrado los datos.", e)
        }

        if (encryptedBase64 != null || ivBase64 != null) {
            if (encryptedBase64 == null || ivBase64 == null) {
                throw IllegalStateException("La clave cifrada de la base está incompleta. No se han borrado los datos.")
            }
            val decrypted = runCatching {
                val encrypted = Base64.decode(encryptedBase64, Base64.NO_WRAP)
                val iv = Base64.decode(ivBase64, Base64.NO_WRAP)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, masterKey, GCMParameterSpec(128, iv))
                cipher.doFinal(encrypted)
            }.getOrNull()

            if (decrypted != null) return decrypted
            throw IllegalStateException("No se pudo descifrar la clave de la base. Restaure una copia segura; los datos se conservaron.")
        }
        if (context.getDatabasePath("novagest.db").exists()) {
            throw IllegalStateException("La base existe pero no su clave guardada. No se han borrado los datos.")
        }

        // Generar nueva passphrase aleatoria de 32 bytes
        val newPassphrase = ByteArray(32).apply { SecureRandom().nextBytes(this) }
        run {
            try {
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, masterKey)
                val iv = cipher.iv
                val encrypted = cipher.doFinal(newPassphrase)

                val saved = prefs.edit()
                    .putString(KEY_ENCRYPTED_MATERIAL, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                    .putString(KEY_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
                    .commit()
                check(saved) { "No se pudo persistir la clave de la base" }
            } catch (e: Exception) {
                throw IllegalStateException("No se pudo guardar la clave segura de la base.", e)
            }
        }

        return newPassphrase
    }
}
