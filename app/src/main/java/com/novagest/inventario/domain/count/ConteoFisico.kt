package com.novagest.inventario.domain.count

import com.novagest.inventario.domain.model.MovementType
import com.novagest.inventario.domain.model.Product
import com.novagest.inventario.util.Money

/**
 * A-20 · Conteo físico guiado.
 *
 * Contar la mercancía del estante con el teléfono en la mano: se recorre el almacén y cada
 * código que lee la cámara suma una unidad al producto. Al terminar, la app dice qué falta,
 * qué sobra y cuánto vale la diferencia, y propone el **ajuste** como movimiento.
 *
 * Aquí no hay cámara ni Android: solo la cuenta, el orden de visita y los textos. Así se
 * puede probar en la máquina de desarrollo y la pantalla solo dibuja.
 *
 * Reglas:
 *  - Un producto **sin contar** no es un faltante: se queda pendiente y no genera ajuste.
 *  - El ajuste es la diferencia `contado − esperado`: si es positiva falta mercancía en el
 *    sistema (ENTRADA), si es negativa sobra papel (SALIDA).
 *  - Un código que no está en el catálogo se cuenta como **desconocido**, no se inventa.
 */
object ConteoFisico {

    /** Cómo va cada línea del conteo. */
    enum class Estado(val etiqueta: String) {
        PENDIENTE("Sin contar"),
        OK("Cuadra"),
        FALTANTE("Falta mercancía"),
        SOBRANTE("Sobra en el sistema"),
        DESCONOCIDO("No está en el catálogo")
    }

    /** Una línea del conteo: lo que dice el sistema y lo que se contó en el estante. */
    data class Linea(
        val productId: Long,
        val nombre: String,
        val categoria: String = "General",
        val barcode: String = "",
        val esperado: Double = 0.0,
        val contado: Double? = null,
        val costo: Double = 0.0,
        val precio: Double = 0.0
    ) {
        val diferencia: Double get() = if (contado == null) 0.0 else redondear(contado - esperado)
        val estado: Estado
            get() = when {
                contado == null -> Estado.PENDIENTE
                diferencia > 0 -> Estado.FALTANTE
                diferencia < 0 -> Estado.SOBRANTE
                else -> Estado.OK
            }
        /** Valor en USD de la diferencia, a precio de costo. */
        val valorDiferencia: Double get() = redondear(diferencia * costo)
        /** Movimiento que corrige el stock; `null` si cuadra o no se contó. */
        val ajuste: MovementType?
            get() = when {
                contado == null || diferencia == 0.0 -> null
                diferencia > 0 -> MovementType.ENTRADA
                else -> MovementType.SALIDA
            }
        /** Unidades a mover en el ajuste (siempre positiva). */
        val unidadesAjuste: Double get() = kotlin.math.abs(diferencia)
    }

    /** Un código leído que no corresponde a ningún producto activo. */
    data class Desconocido(val barcode: String, val veces: Int = 1)

    /** Resultado de un escaneo: qué pasó, para avisar en pantalla. */
    data class Escaneo(
        val lineas: List<Linea>,
        val desconocidos: List<Desconocido>,
        val mensaje: String,
        val acertado: Boolean
    )

    /** Avance del conteo: cuántos van y cuántos faltan. */
    data class Avance(val total: Int, val contados: Int) {
        val pendientes: Int get() = (total - contados).coerceAtLeast(0)
        val pct: Int get() = if (total <= 0) 100 else (contados * 100 / total).coerceIn(0, 100)
        val texto: String get() = "$contados de $total contados ($pct %)"
    }

    /** Totales del conteo, listos para el resumen y el acta. */
    data class Resumen(
        val contados: Int,
        val cuadran: Int,
        val faltantes: Int,
        val sobrantes: Int,
        val unidadesFaltantes: Double,
        val unidadesSobrantes: Double,
        val valorFaltante: Double,
        val valorSobrante: Double,
        val desconocidos: Int
    ) {
        val conDiferencia: Int get() = faltantes + sobrantes
        val ajustes: Int get() = faltantes + sobrantes
        val texto: String
            get() = when {
                contados == 0 -> "Todavía no se ha contado ningún producto."
                conDiferencia == 0 -> "Los $contados producto(s) contados cuadran con el sistema."
                else -> "$conDiferencia producto(s) con diferencia: faltan ${Money.qty(unidadesFaltantes)} " +
                    "y sobran ${Money.qty(unidadesSobrantes)} (${Money.usd(valorFaltante - valorSobrante)} a costo)."
            }
    }

    /** Arma las líneas del conteo a partir del catálogo activo. */
    fun lineasDe(productos: List<Product>): List<Linea> = productos
        .filter { it.active }
        .map {
            Linea(
                productId = it.id,
                nombre = it.name,
                categoria = it.category,
                barcode = it.barcode,
                esperado = redondear(it.stockActual),
                costo = it.precioCostoUsd,
                precio = it.precioVentaUsd
            )
        }

    /** Orden de visita: por categoría y nombre, con los pendientes primero. */
    fun ordenGuiado(lineas: List<Linea>, soloPendientes: Boolean = true): List<Linea> {
        val base = if (soloPendientes) lineas.filter { it.contado == null } else lineas
        return base.sortedWith(compareBy({ it.categoria.lowercase() }, { it.nombre.lowercase() }))
    }

    /** La siguiente línea sin contar después de [desdeId] (o la primera si ya no queda). */
    fun siguientePendiente(lineas: List<Linea>, desdeId: Long? = null): Linea? {
        val pendientes = ordenGuiado(lineas)
        if (pendientes.isEmpty()) return null
        val i = pendientes.indexOfFirst { it.productId == desdeId }
        return if (i >= 0 && i + 1 < pendientes.size) pendientes[i + 1] else pendientes.first()
    }

    /**
     * Aplica un código leído por la cámara: suma [cantidad] al producto si está en el catálogo.
     * Si el código no existe, no se inventa nada: se acumula como desconocido.
     */
    fun escanear(
        lineas: List<Linea>,
        desconocidos: List<Desconocido>,
        barcode: String,
        cantidad: Double = 1.0
    ): Escaneo {
        val codigo = barcode.trim()
        if (codigo.isEmpty()) {
            return Escaneo(lineas, desconocidos, "El código está vacío.", false)
        }
        val i = lineas.indexOfFirst { it.barcode.isNotBlank() && it.barcode == codigo }
        if (i < 0) {
            val ya = desconocidos.firstOrNull { it.barcode == codigo }
            val lista = if (ya == null) desconocidos + Desconocido(codigo, 1)
            else desconocidos.map { if (it.barcode == codigo) it.copy(veces = it.veces + 1) else it }
            return Escaneo(
                lineas, lista,
                "El código $codigo no está en el catálogo. Anótelo aparte o cárguelo después.",
                false
            )
        }
        val l = lineas[i]
        val nuevo = redondear((l.contado ?: 0.0) + cantidad)
        val actualizadas = lineas.toMutableList().also { it[i] = l.copy(contado = nuevo) }
        return Escaneo(
            actualizadas, desconocidos,
            "${l.nombre}: ${Money.qty(nuevo)} contado(s) de ${Money.qty(l.esperado)}",
            true
        )
    }

    /** Fija el conteo de un producto a mano (0 es un conteo válido: no queda nada). */
    fun fijar(lineas: List<Linea>, productId: Long, contado: Double?): List<Linea> =
        lineas.map { if (it.productId == productId) it.copy(contado = contado?.let { c -> redondear(c.coerceAtLeast(0.0)) }) else it }

    /** Vuelve a poner en «sin contar» las líneas indicadas (o todas, si la lista viene vacía). */
    fun reiniciar(lineas: List<Linea>, productIds: List<Long> = emptyList()): List<Linea> =
        if (productIds.isEmpty()) lineas.map { it.copy(contado = null) }
        else lineas.map { if (it.productId in productIds) it.copy(contado = null) else it }

    /** Búsqueda por nombre, código o categoría para contar a mano. */
    fun buscar(lineas: List<Linea>, q: String): List<Linea> {
        val t = q.trim().lowercase()
        if (t.isEmpty()) return lineas
        return lineas.filter {
            it.nombre.lowercase().contains(t) ||
                it.barcode.lowercase().contains(t) ||
                it.categoria.lowercase().contains(t)
        }
    }

    fun avance(lineas: List<Linea>): Avance = Avance(lineas.size, lineas.count { it.contado != null })

    fun resumen(lineas: List<Linea>, desconocidos: List<Desconocido> = emptyList()): Resumen {
        val contadas = lineas.filter { it.contado != null }
        val faltan = contadas.filter { it.estado == Estado.FALTANTE }
        val sobran = contadas.filter { it.estado == Estado.SOBRANTE }
        return Resumen(
            contados = contadas.size,
            cuadran = contadas.count { it.estado == Estado.OK },
            faltantes = faltan.size,
            sobrantes = sobran.size,
            unidadesFaltantes = redondear(faltan.sumOf { it.diferencia }),
            unidadesSobrantes = redondear(kotlin.math.abs(sobran.sumOf { it.diferencia })),
            valorFaltante = redondear(faltan.sumOf { it.valorDiferencia }),
            valorSobrante = redondear(kotlin.math.abs(sobran.sumOf { it.valorDiferencia })),
            desconocidos = desconocidos.sumOf { it.veces }
        )
    }

    /** Las líneas que van a generar un movimiento de ajuste, en el orden del catálogo. */
    fun ajustes(lineas: List<Linea>): List<Linea> =
        lineas.filter { it.ajuste != null }.sortedBy { it.nombre.lowercase() }

    /** Nota que se guarda en cada movimiento de ajuste (queda en el historial y en la auditoría). */
    fun notaAjuste(linea: Linea, fecha: String): String =
        "Conteo físico $fecha · contado ${Money.qty(linea.contado ?: 0.0)} de ${Money.qty(linea.esperado)}"

    /** Texto del acta para copiar o compartir al terminar. */
    fun acta(lineas: List<Linea>, desconocidos: List<Desconocido>, negocio: String, fecha: String): String {
        val r = resumen(lineas, desconocidos)
        val av = avance(lineas)
        val sb = StringBuilder()
        sb.append("🧮 *Conteo físico*").append("\n")
        sb.append(negocio.ifBlank { "NovaGest" }).append(" · ").append(fecha).append("\n")
        sb.append(av.texto).append("\n\n")
        val conDif = lineas.filter { it.estado == Estado.FALTANTE || it.estado == Estado.SOBRANTE }
        if (conDif.isEmpty()) {
            sb.append("Todo lo contado cuadra con el sistema.")
        } else {
            conDif.sortedBy { it.nombre.lowercase() }.forEach { l ->
                val signo = if (l.diferencia > 0) "+" else "−"
                sb.append("• ").append(l.nombre).append(": ")
                    .append(Money.qty(l.esperado)).append(" → ").append(Money.qty(l.contado ?: 0.0))
                    .append(" (").append(signo).append(Money.qty(l.unidadesAjuste)).append(")\n")
            }
        }
        if (desconocidos.isNotEmpty()) {
            sb.append("\nCódigos fuera del catálogo: ")
            sb.append(desconocidos.joinToString(", ") { "${it.barcode} ×${it.veces}" })
            sb.append("\n")
        }
        sb.append("\n").append(r.texto)
        return sb.toString().trim()
    }

    /** CSV con una fila por producto contado (punto y coma, como espera Excel en español). */
    fun csv(lineas: List<Linea>, desconocidos: List<Desconocido> = emptyList()): String {
        val cab = "Producto;Categoría;Código;Esperado;Contado;Diferencia;Estado;Ajuste;Costo unitario USD;Valor diferencia USD"
        val filas = lineas
            .filter { it.contado != null }
            .sortedBy { it.nombre.lowercase() }
            .map { l ->
                listOf(
                    l.nombre, l.categoria, l.barcode, numero(l.esperado), numero(l.contado ?: 0.0),
                    numero(l.diferencia), l.estado.etiqueta,
                    l.ajuste?.name ?: "", numero(l.costo), numero(l.valorDiferencia)
                ).joinToString(";") { celda(it) }
            }
        val fuera = desconocidos.map { d ->
            listOf(d.barcode, "", d.barcode, "0", numero(d.veces.toDouble()), numero(d.veces.toDouble()), "No está en el catálogo", "ENTRADA", "0", "0")
                .joinToString(";") { celda(it) }
        }
        return (listOf(cab) + filas + fuera).joinToString("\r\n") + "\r\n"
    }

    private fun numero(v: Double): String =
        if (v % 1.0 == 0.0) v.toInt().toString() else "%,.2f".format(java.util.Locale.US, v)

    private fun celda(s: String): String = if (s.contains(';') || s.contains('"') || s.contains('\n')) {
        "\"" + s.replace("\"", "\"\"") + "\""
    } else s

    private fun redondear(v: Double): Double = kotlin.math.round(v * 100.0) / 100.0
}
