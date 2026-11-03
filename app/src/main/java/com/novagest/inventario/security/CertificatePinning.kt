package com.novagest.inventario.security

import android.content.Context
import java.net.URL
import java.security.MessageDigest
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLPeerUnverifiedException

/**
 * H3 (auditoría 2026): certificate pinning opcional para servidores con dominio público.
 *
 * Los pins (SHA-256 de la clave pública, formato `sha256/...` en base64) se leen de
 * `assets/pins.txt`, un pin por línea. Si el archivo no existe o está vacío, no se
 * aplica pinning (útil en LAN con mkcert, donde la CA de usuario es la raíz local).
 * Solo se aplica a hosts que NO son locales (localhost/127.x/192.168.x/10.x/172.16-31.x).
 */
object CertificatePinning {

    private fun esLocal(host: String): Boolean {
        if (host == "localhost" || host.startsWith("127.") || host.startsWith("192.168.")) return true
        if (host.startsWith("10.") || host.startsWith("172.")) {
            val segundo = host.split('.').getOrNull(1)?.toIntOrNull() ?: return false
            return segundo in 16..31
        }
        return false
    }

    fun cargarPins(context: Context): Set<String> = try {
        context.assets.open("pins.txt").bufferedReader().useLines { lines ->
            lines.map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") }.toSet()
        }
    } catch (e: Exception) {
        emptySet()
    }

    private fun pinDe(cert: X509Certificate): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(cert.publicKey.encoded)
        return "sha256/" + android.util.Base64.encodeToString(digest, android.util.Base64.NO_WRAP)
    }

    /** Aplica pinning a la conexión si procede; devuelve true si se aplicó. */
    fun aplicar(context: Context, conn: HttpsURLConnection): Boolean {
        val url = URL(conn.url.toString())
        if (esLocal(url.host)) return false
        val pins = cargarPins(context)
        if (pins.isEmpty()) return false
        val chain = try {
            conn.connect()
            conn.serverCertificates.filterIsInstance<X509Certificate>()
        } catch (e: SSLPeerUnverifiedException) {
            return false
        }
        check(chain.any { pinDe(it) in pins }) {
            "Certificado no anclado (pinning): se rechaza la conexión a ${url.host}"
        }
        return true
    }
}
