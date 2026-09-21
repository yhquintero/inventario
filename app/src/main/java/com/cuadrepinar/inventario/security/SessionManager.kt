package com.cuadrepinar.inventario.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "session",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun save(userId: Long, username: String, role: String, displayName: String) {
        prefs.edit()
            .putLong("userId", userId)
            .putString("username", username)
            .putString("role", role)
            .putString("displayName", displayName)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    fun userId(): Long = prefs.getLong("userId", -1L)
    fun username(): String? = prefs.getString("username", null)
    fun role(): String? = prefs.getString("role", null)
    fun displayName(): String? = prefs.getString("displayName", null)
    fun isLoggedIn(): Boolean = userId() > 0
}
