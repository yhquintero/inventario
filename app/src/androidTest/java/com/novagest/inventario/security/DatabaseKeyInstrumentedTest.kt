package com.novagest.inventario.security

import android.content.Context
import android.util.Base64
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNotEquals
import org.junit.Test
import org.junit.runner.RunWith

/** Verifica en dispositivo/emulador la persistencia de la clave protegida por Android Keystore. */
@RunWith(AndroidJUnit4::class)
class DatabaseKeyInstrumentedTest {

    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Test
    fun passphrase_se_persiste_cifrada_y_se_recupera_igual() {
        val first = DatabaseKey.passphrase(context)
        val second = DatabaseKey.passphrase(context)

        assertEquals("SQLCipher usa una passphrase aleatoria de 256 bits", 32, first.size)
        assertArrayEquals("la clave recuperada debe permanecer estable", first, second)

        val preferences = context.getSharedPreferences("novagest_db_key_prefs", Context.MODE_PRIVATE)
        val encrypted = preferences.getString("encrypted_passphrase", null)
        val iv = preferences.getString("iv", null)
        assertNotNull("se conserva el material cifrado", encrypted)
        assertNotNull("se conserva el IV de AES-GCM", iv)
        assertNotEquals(
            "SharedPreferences no debe guardar la passphrase en claro",
            Base64.encodeToString(first, Base64.NO_WRAP),
            encrypted
        )
    }
}
