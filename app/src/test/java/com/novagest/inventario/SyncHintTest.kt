package com.novagest.inventario

import com.novagest.inventario.ui.components.SyncHint
import org.junit.Assert.assertEquals
import org.junit.Test

/** Pruebas del aviso de cambios sin subir (A-17). */
class SyncHintTest {

    @Test
    fun laInsigniaSoloCuentaConConexionYSinSincronizar() {
        assertEquals(0, SyncHint.badge(0, connected = true, busy = false))
        assertEquals(3, SyncHint.badge(3, connected = true, busy = false))
        assertEquals(0, SyncHint.badge(3, connected = false, busy = false))
        assertEquals(0, SyncHint.badge(3, connected = true, busy = true))
        assertEquals(0, SyncHint.badge(-2, connected = true, busy = false))
    }

    @Test
    fun elAvisoDiceCuantosCambiosYCuandoSeReintenta() {
        assertEquals("2 cambio(s) sin subir · reintento en 45 s", SyncHint.banner(2, 45, false))
        assertEquals("1 cambio(s) sin subir: se reintentará solo", SyncHint.banner(1, 0, true))
        assertEquals("Sin conexión con el servidor", SyncHint.banner(0, 0, true))
        assertEquals("Todo sincronizado", SyncHint.banner(0, 0, false))
    }

    @Test
    fun elIconoExplicaElEstadoALosLectoresDePantalla() {
        assertEquals("Sincronizando…", SyncHint.iconLabel(true, true, 4))
        assertEquals("Sin conexión con el servidor", SyncHint.iconLabel(false, false, 4))
        assertEquals("Sincronizado · 4 cambio(s) sin subir", SyncHint.iconLabel(true, false, 4))
        assertEquals("Sincronizado con el servidor", SyncHint.iconLabel(true, false, 0))
    }

    @Test
    fun elBotonCambiaDeTextoCuandoHayPendientes() {
        assertEquals("Sincronizar ahora", SyncHint.actionLabel(3))
        assertEquals("Reintentar", SyncHint.actionLabel(0))
    }

    @Test
    fun ajustesResumeElEstadoDeLaCola() {
        assertEquals("No hay cambios pendientes de subir.", SyncHint.settingsSummary(0, 0))
        assertEquals("5 cambio(s) sin subir · próximo intento en 30 s", SyncHint.settingsSummary(5, 30))
        assertEquals(
            "5 cambio(s) sin subir · se subirán en cuanto haya conexión",
            SyncHint.settingsSummary(5, 0)
        )
    }
}
