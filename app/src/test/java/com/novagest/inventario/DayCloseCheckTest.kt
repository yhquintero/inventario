package com.novagest.inventario

import com.novagest.inventario.domain.usecase.DayCloseCheck
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pruebas del aviso de cierre del día (A-08). */
class DayCloseCheckTest {

    @Test
    fun avisaSoloDespuesDeLaHoraDeCierreConVentasSinCuadrar() {
        assertTrue(DayCloseCheck.needsReminder(hasCuadre = false, hour = 20, sales = 3))
        assertTrue(DayCloseCheck.needsReminder(hasCuadre = false, hour = 23, sales = 1))
        // Antes de la hora no molesta.
        assertFalse(DayCloseCheck.needsReminder(hasCuadre = false, hour = 19, sales = 5))
        // Si ya está cuadrado, nada que avisar.
        assertFalse(DayCloseCheck.needsReminder(hasCuadre = true, hour = 21, sales = 5))
        // Un día sin ventas no se avisa.
        assertFalse(DayCloseCheck.needsReminder(hasCuadre = false, hour = 21, sales = 0))
    }

    @Test
    fun elMensajeDiceCuantasVentasQuedanSinCuadrar() {
        assertEquals("3 venta(s) sin cuadre: registra el cierre del día antes de cerrar la caja.", DayCloseCheck.message(3))
        assertEquals("No hubo ventas hoy: no hay nada que cuadrar.", DayCloseCheck.message(0))
    }

    @Test
    fun elTituloCambiaSegunElEstado() {
        assertEquals("Falta cuadrar el día · NovaGest", DayCloseCheck.title(false))
        assertEquals("Día cuadrado · NovaGest", DayCloseCheck.title(true))
    }

    @Test
    fun laHoraDeCierreEsLaDeLaTarde() {
        assertEquals(20, DayCloseCheck.HOUR)
    }
}
