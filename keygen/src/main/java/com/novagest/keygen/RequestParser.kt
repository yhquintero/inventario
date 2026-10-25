package com.novagest.keygen

/** Datos que se pueden leer del mensaje de solicitud que envía el cliente. */
data class LicenseRequest(val client: String?, val termLabel: String?, val deviceId: String?)

/**
 * Lee el mensaje que la app NovaGest envía por WhatsApp (LicenseManager.licenseRequestMessage):
 *
 * ```
 * Hola, solicito activar mi Licencia de NovaGest.
 *
 * 👤 Usuario: Tienda Rosa
 * 🆔 ID Dispositivo: android-1a2b3c4d
 * 📦 Producto: NovaGest v1.0.0
 * 📅 Plan: 1 mes (30 días) · FULL
 * ```
 *
 * Devuelve null si el texto no contiene ni usuario ni plan, para no rellenar el formulario
 * con cualquier cosa que haya en el portapapeles.
 */
fun parseLicenseRequest(raw: String?): LicenseRequest? {
    if (raw.isNullOrBlank()) return null
    var client: String? = null
    var term: String? = null
    var device: String? = null

    raw.lineSequence().forEach { linea ->
        val l = linea.trim()
        when {
            l.startsWith("👤") -> client = l.substringAfter(':', "").trim().ifBlank { null }
            l.startsWith("🆔") -> device = l.substringAfter(':', "").trim().ifBlank { null }
            l.startsWith("📅") -> {
                // "1 mes (30 días) · FULL" → "1 mes"
                val plan = l.substringAfter(':', "").trim()
                term = plan.substringBefore('(').substringBefore('·').trim().ifBlank { null }
            }
        }
    }
    return if (client == null && term == null) null else LicenseRequest(client, term, device)
}
