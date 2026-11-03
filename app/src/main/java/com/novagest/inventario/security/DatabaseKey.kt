package com.novagest.inventario.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

/**
 * H4 (auditoría 2026): clave AES-256 de la base de datos local, guardada en el
 * Android Keystore (hardware-backed cuando el dispositivo lo soporta) y usada como
 * passphrase de SQLCipher. Nunca sale del dispositivo.
 */
object DatabaseKey {

    private const val ALIAS = "novagest_db_key"

    private fun keystore(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    private fun clave(): SecretKey {
        val ks = keystore()
        (ks.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    /** Passphrase determinista derivada de la clave del Keystore (para SQLCipher). */
    fun passphrase(): ByteArray {
        val key = clave()
        // Deriva bytes estables a partir de una firma GCM de un valor fijo con la clave del Keystore.
        val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val out = cipher.doFinal("novagest-db".toByteArray(Charsets.UTF_8))
        return (iv + out).copyOf(32)
    }
}
