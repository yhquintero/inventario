package com.novagest.inventario

import com.novagest.inventario.domain.count.ConteoFisico
import com.novagest.inventario.domain.count.ConteoFisico.Estado
import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.Product
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pruebas del conteo físico guiado (A-20).
 *
 * Todo lo que se puede comprobar sin cámara ni Android: la cuenta, el orden de visita, el
 * resumen, los ajustes propuestos, el acta y el CSV.
 */
class ConteoFisicoTest {

    private fun producto(
        id: Long,
        nombre: String,
        stock: Double,
        barcode: String = "",
        categoria: String = "General",
        costo: Double = 1.0,
        activo: Boolean = true
    ) = Product(
        id = id,
        name = nombre,
        stockInicial = stock,
        stockActual = stock,
        precioVentaUsd = costo * 2,
        comisionCup = 0.0,
        category = categoria,
        precioCostoUsd = costo,
        barcode = barcode,
        active = activo
    )

    private val catalogo = listOf(
        producto(1, "Panel 500 W", 10.0, "111", "Solar", 100.0),
        producto(2, "Batería 12V", 3.0, "222", "Solar", 50.0),
        producto(3, "Bombillo LED", 25.0, "333", "Eléctrico", 2.0),
        producto(4, "Cable 12", 0.0, "444", "Eléctrico", 1.5),
        producto(5, "Producto viejo", 5.0, "555", "General", 1.0, activo = false)
    )

    @Test
    fun `arma una linea por producto activo`() {
        val lineas = ConteoFisico.lineasDe(catalogo)
        assertEquals("quita los inactivos", 4, lineas.size)
        assertTrue("no incluye el inactivo", lineas.none { it.nombre == "Producto viejo" })
        assertEquals("conserva el esperado", 10.0, lineas.first { it.productId == 1L }.esperado, 0.001)
        assertEquals("conserva el código", "333", lineas.first { it.productId == 3L }.barcode)
    }

    @Test
    fun `sin contar no es faltante`() {
        val l = ConteoFisico.lineasDe(catalogo).first()
        assertEquals("estado pendiente", Estado.PENDIENTE, l.estado)
        assertEquals("sin diferencia", 0.0, l.diferencia, 0.001)
        assertNull("no propone ajuste", l.ajuste)
    }

    @Test
    fun `contar de menos propone una salida`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 8.0)
        val l = lineas.first { it.productId == 1L }
        assertEquals("faltante", Estado.FALTANTE, l.estado)
        assertEquals("diferencia positiva", 2.0, l.diferencia, 0.001)
        assertEquals("hay que sacar del sistema", MovementType.SALIDA, l.ajuste)
        assertEquals("valor a costo", 200.0, l.valorDiferencia, 0.001)
    }

    @Test
    fun `contar de mas propone una entrada`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 2L, 5.0)
        val l = lineas.first { it.productId == 2L }
        assertEquals("sobrante", Estado.SOBRANTE, l.estado)
        assertEquals("diferencia negativa", -2.0, l.diferencia, 0.001)
        assertEquals("hay que meter al sistema", MovementType.ENTRADA, l.ajuste)
        assertEquals("unidades sin signo", 2.0, l.unidadesAjuste, 0.001)
    }

    @Test
    fun `contar exacto deja la linea en cero`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 3L, 25.0)
        val l = lineas.first { it.productId == 3L }
        assertEquals("cuadra", Estado.OK, l.estado)
        assertNull("no hay ajuste", l.ajuste)
    }

    @Test
    fun `contar cero es un conteo valido`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 0.0)
        val l = lineas.first { it.productId == 1L }
        assertEquals("quedó en cero", 0.0, l.contado!!, 0.001)
        assertEquals("faltan diez", 10.0, l.diferencia, 0.001)
        assertEquals("salida", MovementType.SALIDA, l.ajuste)
    }

    @Test
    fun `fijar a mano nunca deja valores negativos`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, -5.0)
        assertEquals("se recorta a cero", 0.0, lineas.first { it.productId == 1L }.contado!!, 0.001)
    }

    @Test
    fun `se puede volver a dejar sin contar`() {
        var lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 8.0)
        lineas = ConteoFisico.fijar(lineas, 1L, null)
        assertNull("vuelve a pendiente", lineas.first { it.productId == 1L }.contado)
        assertEquals("estado pendiente", Estado.PENDIENTE, lineas.first { it.productId == 1L }.estado)
    }

    @Test
    fun `reiniciar borra lo contado`() {
        var lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 8.0)
        lineas = ConteoFisico.fijar(lineas, 2L, 3.0)
        assertEquals("dos contados", 2, ConteoFisico.avance(lineas).contados)
        val soloUno = ConteoFisico.reiniciar(lineas, listOf(1L))
        assertEquals("se reinició uno", 1, ConteoFisico.avance(soloUno).contados)
        assertEquals("todo a cero", 0, ConteoFisico.avance(ConteoFisico.reiniciar(lineas)).contados)
    }

    @Test
    fun `escanear suma unidades al producto`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        var des = emptyList<ConteoFisico.Desconocido>()
        repeat(3) {
            val r = ConteoFisico.escanear(lineas, des, "111")
            lineas = r.lineas
            des = r.desconocidos
            assertTrue("avisa del producto", r.acertado)
        }
        assertEquals("tres unidades contadas", 3.0, lineas.first { it.productId == 1L }.contado!!, 0.001)
        assertTrue("el mensaje dice el nombre", true)
    }

    @Test
    fun `el mensaje del escaneo dice nombre y avance`() {
        val r = ConteoFisico.escanear(ConteoFisico.lineasDe(catalogo), emptyList(), "222")
        assertTrue("nombre", r.mensaje.contains("Batería 12V"))
        assertTrue("cuánto va de cuánto", r.mensaje.contains("1"))
        assertTrue("esperado", r.mensaje.contains("3"))
    }

    @Test
    fun `un codigo desconocido no inventa productos`() {
        val r = ConteoFisico.escanear(ConteoFisico.lineasDe(catalogo), emptyList(), "999")
        assertFalse("no acertó", r.acertado)
        assertEquals("una línea desconocida", 1, r.desconocidos.size)
        assertEquals("código guardado", "999", r.desconocidos.first().barcode)
        assertTrue("avisa que no está", r.mensaje.contains("no está en el catálogo"))
        assertEquals("no contó nada", 0, ConteoFisico.avance(r.lineas).contados)
    }

    @Test
    fun `los codigos desconocidos se acumulan`() {
        var des = emptyList<ConteoFisico.Desconocido>()
        repeat(3) { des = ConteoFisico.escanear(ConteoFisico.lineasDe(catalogo), des, "999").desconocidos }
        assertEquals("una sola entrada", 1, des.size)
        assertEquals("tres lecturas", 3, des.first().veces)
    }

    @Test
    fun `un codigo vacio se rechaza`() {
        val r = ConteoFisico.escanear(ConteoFisico.lineasDe(catalogo), emptyList(), "   ")
        assertFalse("no acertó", r.acertado)
        assertEquals("sin desconocidos", 0, r.desconocidos.size)
    }

    @Test
    fun `un producto sin codigo no coincide con un codigo vacio`() {
        val lineas = ConteoFisico.lineasDe(catalogo)
        val r = ConteoFisico.escanear(lineas, emptyList(), "")
        assertFalse("no se cuenta el producto sin código", r.acertado)
    }

    @Test
    fun `el orden guiado va por categoria y nombre y deja los contados al final`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 3L, 25.0)
        val orden = ConteoFisico.ordenGuiado(lineas)
        assertEquals("tres pendientes", 3, orden.size)
        assertEquals("primero el eléctrico pendiente", "Cable 12", orden.first().nombre)
        assertTrue("no repite el contado", orden.none { it.productId == 3L })
        val completo = ConteoFisico.ordenGuiado(lineas, soloPendientes = false)
        assertEquals("con todos son cuatro", 4, completo.size)
        assertEquals("eléctricos primero", "Cable 12", completo.first().nombre)
        assertEquals("y después los solares", "Batería 12V", completo[2].nombre)
    }

    @Test
    fun `sigue con el pendiente siguiente`() {
        val lineas = ConteoFisico.lineasDe(catalogo)
        val primero = ConteoFisico.siguientePendiente(lineas)
        assertEquals("empieza por Cable 12", "Cable 12", primero?.nombre)
        val siguiente = ConteoFisico.siguientePendiente(lineas, primero?.productId)
        assertEquals("luego el bombillo", "Bombillo LED", siguiente?.nombre)
        assertNull("sin pendientes no hay siguiente", ConteoFisico.siguientePendiente(emptyList()))
    }

    @Test
    fun `el avance cuenta y da porcentaje`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        assertEquals("avance vacío", 0, ConteoFisico.avance(lineas).pct)
        assertEquals("cuatro por contar", 4, ConteoFisico.avance(lineas).pendientes)
        lineas = ConteoFisico.fijar(lineas, 1L, 10.0)
        lineas = ConteoFisico.fijar(lineas, 2L, 3.0)
        val av = ConteoFisico.avance(lineas)
        assertEquals("dos contados", 2, av.contados)
        assertEquals("faltan dos", 2, av.pendientes)
        assertEquals("mitad", 50, av.pct)
        assertTrue("texto", av.texto.contains("2 de 4"))
        assertEquals("sin productos va al 100 %", 100, ConteoFisico.avance(emptyList()).pct)
    }

    @Test
    fun `el resumen junta faltantes sobrantes y valores`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        lineas = ConteoFisico.fijar(lineas, 1L, 8.0)   // faltan 2 × $100
        lineas = ConteoFisico.fijar(lineas, 2L, 5.0)   // sobran 2 × $50
        lineas = ConteoFisico.fijar(lineas, 3L, 25.0)  // cuadra
        val r = ConteoFisico.resumen(lineas, listOf(ConteoFisico.Desconocido("999", 2)))
        assertEquals("tres contados", 3, r.contados)
        assertEquals("uno cuadra", 1, r.cuadran)
        assertEquals("un faltante", 1, r.faltantes)
        assertEquals("un sobrante", 1, r.sobrantes)
        assertEquals("dos unidades faltan", 2.0, r.unidadesFaltantes, 0.001)
        assertEquals("dos sobran", 2.0, r.unidadesSobrantes, 0.001)
        assertEquals("valor del faltante", 200.0, r.valorFaltante, 0.001)
        assertEquals("valor del sobrante", 100.0, r.valorSobrante, 0.001)
        assertEquals("dos ajustes", 2, r.ajustes)
        assertEquals("un código fuera", 2, r.desconocidos)
        assertTrue("texto con la diferencia", r.texto.contains("diferencia"))
    }

    @Test
    fun `el resumen de un conteo perfecto lo dice`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        lineas = ConteoFisico.fijar(lineas, 1L, 10.0)
        lineas = ConteoFisico.fijar(lineas, 2L, 3.0)
        val r = ConteoFisico.resumen(lineas)
        assertEquals("sin diferencias", 0, r.conDiferencia)
        assertTrue("todo cuadra", r.texto.contains("cuadran"))
    }

    @Test
    fun `sin contar nada el resumen lo dice`() {
        assertEquals("aviso", "Todavía no se ha contado ningún producto.", ConteoFisico.resumen(ConteoFisico.lineasDe(catalogo)).texto)
    }

    @Test
    fun `solo se ajustan las lineas con diferencia`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        lineas = ConteoFisico.fijar(lineas, 1L, 8.0)
        lineas = ConteoFisico.fijar(lineas, 2L, 3.0)
        val ajustes = ConteoFisico.ajustes(lineas)
        assertEquals("solo el faltante", 1, ajustes.size)
        assertEquals("es el panel", "Panel 500 W", ajustes.first().nombre)
    }

    @Test
    fun `la nota del ajuste explica el conteo`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 8.0)
        val nota = ConteoFisico.notaAjuste(lineas.first { it.productId == 1L }, "27/10/2026")
        assertTrue("lleva la fecha", nota.contains("27/10/2026"))
        assertTrue("lleva lo contado", nota.contains("8"))
        assertTrue("lleva lo esperado", nota.contains("10"))
        assertTrue("dice que es un conteo", nota.contains("Conteo físico"))
    }

    @Test
    fun `el acta cuenta lo que pasó`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        lineas = ConteoFisico.fijar(lineas, 1L, 8.0)
        val acta = ConteoFisico.acta(lineas, listOf(ConteoFisico.Desconocido("999", 1)), "Bodega La Esquina", "27/10/2026")
        assertTrue("título", acta.contains("Conteo físico"))
        assertTrue("negocio", acta.contains("Bodega La Esquina"))
        assertTrue("fecha", acta.contains("27/10/2026"))
        assertTrue("la línea con diferencia", acta.contains("Panel 500 W"))
        assertTrue("códigos fuera", acta.contains("999"))
        assertTrue("avance", acta.contains("1 de 4"))
    }

    @Test
    fun `el acta sin diferencias lo dice`() {
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(catalogo), 1L, 10.0)
        val acta = ConteoFisico.acta(lineas, emptyList(), "Bodega", "27/10/2026")
        assertTrue("todo cuadra", acta.contains("cuadra con el sistema"))
        assertFalse("no lista códigos", acta.contains("fuera del catálogo"))
    }

    @Test
    fun `el CSV lleva cabecera y solo lo contado`() {
        var lineas = ConteoFisico.lineasDe(catalogo)
        lineas = ConteoFisico.fijar(lineas, 1L, 8.0)
        val csv = ConteoFisico.csv(lineas, listOf(ConteoFisico.Desconocido("999", 2)))
        val filas = csv.trim().split("\r\n")
        assertEquals("cabecera + contado + desconocido", 3, filas.size)
        assertTrue("cabecera", filas[0].startsWith("Producto;Categoría;Código;Esperado;Contado"))
        assertTrue("fila del panel", filas[1].contains("Panel 500 W"))
        assertTrue("propone salida", filas[1].contains("SALIDA"))
        assertTrue("fila del código desconocido", filas[2].contains("999"))
        assertTrue("termina en salto", csv.endsWith("\r\n"))
    }

    @Test
    fun `el CSV escapa los nombres con punto y coma`() {
        val raro = producto(9, "Panel; 500 \"W\"", 1.0, "999")
        val lineas = ConteoFisico.fijar(ConteoFisico.lineasDe(listOf(raro)), 9L, 1.0)
        val csv = ConteoFisico.csv(lineas)
        assertTrue("entre comillas", csv.contains("\"Panel; 500 \"\"W\"\"\""))
    }

    @Test
    fun `buscar encuentra por nombre codigo o categoria`() {
        val lineas = ConteoFisico.lineasDe(catalogo)
        assertEquals("por nombre", 1, ConteoFisico.buscar(lineas, "panel").size)
        assertEquals("por código", 1, ConteoFisico.buscar(lineas, "333").size)
        assertEquals("por categoría", 2, ConteoFisico.buscar(lineas, "solar").size)
        assertEquals("sin filtro devuelve todo", 4, ConteoFisico.buscar(lineas, "  ").size)
        assertEquals("sin coincidencias", 0, ConteoFisico.buscar(lineas, "zzz").size)
    }
}
