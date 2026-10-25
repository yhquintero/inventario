package com.novagest.keygen

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RequestParserTest {

    private val mensaje = """
        Hola, solicito activar mi Licencia de NovaGest.

        👤 Usuario: Tienda Rosa
        🆔 ID Dispositivo: android-1a2b3c4d
        📦 Producto: NovaGest v1.0.0
        📅 Plan: 1 mes (30 días) · FULL
        🕒 Fecha Actual: 22/10/2026, 4:00:00 p.m.
    """.trimIndent()

    @Test
    fun `lee cliente, plazo y dispositivo`() {
        val r = parseLicenseRequest(mensaje)!!
        assertEquals("Tienda Rosa", r.client)
        assertEquals("1 mes", r.termLabel)
        assertEquals("android-1a2b3c4d", r.deviceId)
    }

    @Test
    fun `sin plazo tambien devuelve el cliente`() {
        val r = parseLicenseRequest("👤 Usuario: Almacén Central\n📦 Producto: NovaGest")!!
        assertEquals("Almacén Central", r.client)
        assertNull(r.termLabel)
    }

    @Test
    fun `texto ajeno devuelve null`() {
        assertNull(parseLicenseRequest("Hola, ¿cómo estás?"))
        assertNull(parseLicenseRequest(""))
        assertNull(parseLicenseRequest(null))
    }

    @Test
    fun `tolera espacios y mayusculas raras`() {
        val r = parseLicenseRequest("  👤  Usuario:   Bodega  Norte  \n  📅 Plan:   Permanente  ·  LIFETIME")!!
        assertEquals("Bodega  Norte", r.client)
        assertEquals("Permanente", r.termLabel)
    }
}
