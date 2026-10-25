package com.novagest.keygen

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * El motor de licencias tiene que producir exactamente la misma cadena que
 * `tools/generate_license.py` y `server/novagest_server.py`; si se separa un byte,
 * el servidor rechaza la clave y el cliente se queda sin activar.
 *
 * El valor esperado se generó con Python usando el mismo secreto y el mismo payload,
 * así que este test detecta cualquier cambio de orden de claves, de espacios en el
 * JSON, de relleno base64 o del algoritmo de firma.
 */
class LicenseKeyEngineTest {

    private val secret = "7A_hAJy7O13CUCP1CZM5FBJNgxmAOaBGzlo6pS4RhvU="

    private val payload = LicensePayload(
        licenseId = "0123456789ABCDEF",
        clientName = "Tienda Rosa",
        product = "NovaGest",
        type = "FULL",
        issuedAt = 1_792_684_800L,
        expiresAt = 1_824_220_800L,
        maxUsers = 20,
        maxDevices = 10,
        features = listOf("*")
    )

    @Test
    fun `el secreto base64url de 44 caracteres son 32 bytes`() {
        assertEquals(32, LicenseKeyEngine.secretBytes(secret).size)
    }

    @Test
    fun `la clave coincide con la que firma el servidor`() {
        val generated = LicenseKeyEngine.createKey(payload, LicenseKeyEngine.secretBytes(secret))
        assertEquals(EXPECTED_KEY, generated)
    }

    @Test
    fun `el id de licencia son 16 caracteres hexadecimales en mayuscula`() {
        val id = LicenseKeyEngine.newLicenseId()
        assertEquals(16, id.length)
        assertTrue("El id debe ser hexadecimal: $id", id.all { it in "0123456789ABCDEF" })
    }

    @Test
    fun `el plazo permanente no caduca`() {
        val permanente = LicenseKeyEngine.TERMS.first { it.id == "PERMANENTE" }
        val p = LicenseKeyEngine.newPayload(
            clientName = "Cliente",
            product = "NovaGest",
            term = permanente,
            type = permanente.type,
            maxUsers = 5,
            maxDevices = 2,
            features = listOf("*"),
            now = 1_792_684_800L
        )
        assertEquals(0L, p.expiresAt)
        assertTrue(p.isPermanent)
    }

    @Test
    fun `un plazo de un mes suma treinta dias`() {
        val mes = LicenseKeyEngine.TERMS.first { it.id == "MES" }
        val p = LicenseKeyEngine.newPayload(
            clientName = "Cliente",
            product = "NovaGest",
            term = mes,
            type = mes.type,
            maxUsers = 5,
            maxDevices = 2,
            features = listOf("*"),
            now = 1_792_684_800L
        )
        assertEquals(1_792_684_800L + 30 * 86_400L, p.expiresAt)
    }

    private companion object {
        /** Calculado con Python: json.dumps(sort_keys) → base64url → HMAC-SHA256. */
        const val EXPECTED_KEY =
            "NG-eyJjbGllbnRfbmFtZSI6IlRpZW5kYSBSb3NhIiwiZXhwaXJlc19hdCI6MTgyNDIyMDgwMCwiZmVhdHVyZXMiOlsiKiJdLCJpc3N1ZWRfYXQiOjE3OTI2ODQ4MDAsImxpY2Vuc2VfaWQiOiIwMTIzNDU2Nzg5QUJDREVGIiwibWF4X2RldmljZXMiOjEwLCJtYXhfdXNlcnMiOjIwLCJwcm9kdWN0IjoiTm92YUdlc3QiLCJ0eXBlIjoiRlVMTCIsInZlcnNpb24iOjF9.hiV24FeJfKYRsBenStcYHATy5mSFATBgEi1H5Z_EZZQ"
    }
}
