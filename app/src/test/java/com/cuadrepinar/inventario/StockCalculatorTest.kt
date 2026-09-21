package com.cuadrepinar.inventario

import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.Role
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.usecase.CuadreCalculator
import com.cuadrepinar.inventario.domain.usecase.StockCalculator
import com.cuadrepinar.inventario.domain.usecase.Validators
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StockCalculatorTest {

    @Test
    fun entradaSumaStock() {
        assertEquals(15.0, StockCalculator.stockFinal(10.0, MovementType.ENTRADA, 5.0), 0.0)
    }

    @Test
    fun ventaRestaStock() {
        assertEquals(7.0, StockCalculator.stockFinal(12.0, MovementType.VENTA, 5.0), 0.0)
    }

    @Test
    fun salidaRestaStock() {
        assertEquals(0.0, StockCalculator.stockFinal(3.0, MovementType.SALIDA, 3.0), 0.0)
    }

    @Test
    fun rechazaStockNegativo() {
        assertTrue(StockCalculator.wouldGoNegative(2.0, MovementType.VENTA, 3.0))
        assertFalse(StockCalculator.wouldGoNegative(2.0, MovementType.VENTA, 2.0))
        assertFalse(StockCalculator.wouldGoNegative(2.0, MovementType.ENTRADA, 100.0))
    }

    @Test
    fun importeSoloEnVenta() {
        assertEquals(340.0, StockCalculator.importeUsd(MovementType.VENTA, 2.0, 170.0), 0.0)
        assertEquals(0.0, StockCalculator.importeUsd(MovementType.SALIDA, 2.0, 170.0), 0.0)
        assertEquals(0.0, StockCalculator.importeUsd(MovementType.ENTRADA, 2.0, 170.0), 0.0)
    }

    @Test
    fun comisionSoloGestor() {
        assertEquals(6000.0, StockCalculator.comisionCup(SaleCenter.GESTOR, 2.0, 3000.0), 0.0)
        assertEquals(0.0, StockCalculator.comisionCup(SaleCenter.TIENDA, 2.0, 3000.0), 0.0)
        assertEquals(0.0, StockCalculator.comisionCup(SaleCenter.MOV, 2.0, 3000.0), 0.0)
    }

    @Test
    fun stockCalculadoComprobacion() {
        // F = B - C + D - E   (inicial - ventas + entradas - salidas)
        assertEquals(8.0, StockCalculator.stockCalculado(10.0, ventas = 5.0, entradas = 4.0, salidas = 1.0), 0.0)
    }
}

class CuadreCalculatorTest {

    @Test
    fun replicaPanelFinancieroExcelLunes() {
        // Datos de lunes en Nuevo Cuadre Pinar.xlsx
        val cuadre = DailyCuadre(
            dateEpoch = 0,
            weekday = "lunes",
            cupUsd = 540.0,
            mxnUsd = 20.0,
            cobroUsd = 4710.0,
            cobroZelle = 360.0,
            cobroCupEfectivo = 1_252_800.0,
            extraccionUsd = 2050.0,
            fondoInicialCup = 100_000.0,
            fondoInicialUsd = 150.0,
            domicilioCup = 11_000.0,
            otrosGastosCup = 2_000.0,
            comisionesCup = 42_000.0
        )
        val ventaFelicity = Movement(
            dateEpoch = 0, weekday = "lunes", productId = 1, type = MovementType.VENTA,
            quantity = 1.0, unitPriceUsd = 3150.0, importeUsd = 3150.0, center = SaleCenter.GESTOR,
            comisionCup = 8000.0, stockInicial = 1.0, stockFinal = 0.0, userId = 1
        )
        val ventaPaneles = Movement(
            dateEpoch = 0, weekday = "lunes", productId = 2, type = MovementType.VENTA,
            quantity = 18.0, unitPriceUsd = 180.0, importeUsd = 3240.0, center = SaleCenter.GESTOR,
            comisionCup = 18_000.0, stockInicial = 87.0, stockFinal = 69.0, userId = 1
        )
        val totals = CuadreCalculator.totals(cuadre, listOf(ventaFelicity, ventaPaneles))
        // cobros = 4710 + 360 + 1252800/540 = 5070 + 2320 = 7390
        assertEquals(7390.0, totals.cobrosUsd, 0.05)
        // extraccion = 2050
        assertEquals(2050.0, totals.extraccionTotalUsd, 0.05)
        // total general = cobros + extraccion - entrada = 7390 + 2050 - 0 = 9440
        assertEquals(9440.0, totals.totalGeneral, 0.05)
        // fondo final CUP = 100000 - 11000 - 2000 - 42000 = 45000
        assertEquals(45_000.0, totals.fondoFinalCup, 0.05)
        assertEquals(150.0, totals.fondoFinalUsd, 0.05)
    }
}

class PermissionsTest {
    @Test
    fun administradorTieneTodo() {
        assertTrue(RolePermissions.can(Role.ADMINISTRADOR, Permission.USERS_EDIT))
        assertTrue(RolePermissions.can(Role.ADMINISTRADOR, Permission.BACKUP_MANAGE))
    }

    @Test
    fun almaceneroNoVeFinanzasNiUsuarios() {
        assertFalse(RolePermissions.can(Role.ALMACENERO, Permission.USERS_EDIT))
        assertFalse(RolePermissions.can(Role.ALMACENERO, Permission.REPORTS_FINANCIAL))
        assertTrue(RolePermissions.can(Role.ALMACENERO, Permission.MOVEMENT_CREATE))
    }

    @Test
    fun economicoReportaPeroNoEditaInventario() {
        assertTrue(RolePermissions.can(Role.ECONOMICO, Permission.REPORTS_EXPORT))
        assertFalse(RolePermissions.can(Role.ECONOMICO, Permission.INVENTORY_EDIT))
        assertTrue(RolePermissions.can(Role.ECONOMICO, Permission.EXCHANGE_EDIT))
    }
}

class ValidatorsTest {
    @Test
    fun passwordRobusta() {
        assertTrue(Validators.password("corta") != null)
        assertTrue(Validators.password("sinnumero") != null)
        assertTrue(Validators.password("sinmayuscula1") != null)
        assertTrue(Validators.password("Admin123!") == null)
    }
}
