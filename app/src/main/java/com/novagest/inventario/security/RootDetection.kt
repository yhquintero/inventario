package com.novagest.inventario.security

import android.os.Build
import java.io.File

/**
 * H5 (auditoría 2026): detección básica de root/jailbreak.
 *
 * No es infalible (el objetivo es disuadir y detectar casos obvios), pero cumple
 * MASVS-RESILIENCE a nivel básico: binarios su conocida, build tags de prueba,
 * paquetes de gestión de root comunes y permisos de test.
 */
object RootDetection {

    private val RUTAS_SU = arrayOf(
        "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/su",
        "/system/bin/.ext/.su", "/system/usr/we-need-root/su", "/su/bin/su"
    )
    private val PAQUETES_ROOT = arrayOf(
        "com.thirdparty.superuser", "eu.chainfire.supersu", "com.koushikdutta.superuser",
        "com.noshufou.android.su", "com.zachspong.temprootremovejb", "com.ramdroid.appquarantine",
        "com.topjohnwu.magisk"
    )

    fun esDispositivoComprometido(packageManager: android.content.pm.PackageManager? = null): Boolean {
        if (RUTAS_SU.any { File(it).exists() }) return true
        if (Build.TAGS?.contains("test-keys") == true) return true
        if (File("/system/app/Superuser.apk").exists()) return true
        if (packageManager != null) {
            for (pkg in PAQUETES_ROOT) {
                try { packageManager.getPackageInfo(pkg, 0); return true } catch (_: Exception) {}
            }
        }
        return false
    }
}
