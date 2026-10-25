package com.novagest.keygen

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * Bloqueo de la herramienta con la biometría del teléfono.
 *
 * Esta app contiene la llave maestra de las licencias: si el teléfono queda desbloqueado
 * sobre la mesa, cualquiera podría emitir claves. El bloqueo es opcional (se activa en la
 * app) porque depende de que el teléfono tenga huella o rostro configurado.
 */
class BiometricGate(private val context: Context) {

    fun canAuthenticate(): Boolean {
        val manager = BiometricManager.from(context)
        val flags = BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        return manager.canAuthenticate(flags) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun prompt(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) =
                    onSuccess()

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED &&
                        errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON
                    ) {
                        onError(errString.toString())
                    }
                }

                override fun onAuthenticationFailed() = onError("No se reconoció la huella.")
            }
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("NovaGest Keygen")
            .setSubtitle("Confirma tu identidad para emitir licencias")
            .setNegativeButtonText("Cancelar")
            .build()
        prompt.authenticate(info)
    }
}

/** Preferencia del bloqueo (un booleano, sin datos sensibles). */
class LockPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("keygen_lock", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) {
            prefs.edit().putBoolean("enabled", value).apply()
        }
}
