package com.novagest.inventario.ui.count

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.novagest.inventario.data.repository.MovementRepository
import com.novagest.inventario.data.repository.ProductRepository
import com.novagest.inventario.domain.count.ConteoFisico
import com.novagest.inventario.domain.count.ConteoFisico.Desconocido
import com.novagest.inventario.domain.count.ConteoFisico.Linea
import com.novagest.inventario.domain.model.AppResult
import com.novagest.inventario.domain.model.SaleCenter
import com.novagest.inventario.domain.model.UserAccount
import com.novagest.inventario.util.Dates
import com.novagest.inventario.util.Money
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * A-20 · Conteo físico guiado con la cámara.
 *
 * El recorrido del estante, en orden: la app lleva la cuenta de lo que se ha contado, avisa de
 * lo que falta por contar y, al cerrar, propone un **ajuste** por cada diferencia (entrada si
 * falta mercancía en el sistema, salida si sobra). Nada se ajusta sin pulsar «Aplicar».
 */
@HiltViewModel
class ConteoViewModel @Inject constructor(
    private val products: ProductRepository,
    private val movements: MovementRepository
) : ViewModel() {
    var lineas by mutableStateOf<List<Linea>>(emptyList())
        private set
    var desconocidos by mutableStateOf<List<Desconocido>>(emptyList())
        private set
    var message by mutableStateOf<String?>(null)
    var cargando by mutableStateOf(true)
    var aplicando by mutableStateOf(false)
    var terminado by mutableStateOf(false)

    init { recargar() }

    fun recargar() {
        viewModelScope.launch {
            cargando = true
            lineas = runCatching { ConteoFisico.lineasDe(products.all()) }.getOrDefault(emptyList())
            cargando = false
        }
    }

    /** Una lectura de la cámara o del lector: suma una unidad al producto de ese código. */
    fun escanear(codigo: String) {
        val r = ConteoFisico.escanear(lineas, desconocidos, codigo)
        lineas = r.lineas
        desconocidos = r.desconocidos
        message = r.mensaje
    }

    /** Corrige a mano lo contado de un producto (`null` = dejarlo sin contar). */
    fun fijar(productId: Long, contado: Double?) {
        lineas = ConteoFisico.fijar(lineas, productId, contado)
    }

    fun reiniciar() {
        lineas = ConteoFisico.reiniciar(lineas)
        desconocidos = emptyList()
        terminado = false
        message = "Conteo reiniciado: no se ha borrado nada del inventario."
    }

    fun resumen() = ConteoFisico.resumen(lineas, desconocidos)

    fun avance() = ConteoFisico.avance(lineas)

    fun ajustes() = ConteoFisico.ajustes(lineas)

    fun acta(negocio: String) = ConteoFisico.acta(lineas, desconocidos, negocio, Dates.format(System.currentTimeMillis()))

    fun csv() = ConteoFisico.csv(lineas, desconocidos)

    /**
     * Aplica un movimiento por cada diferencia contada.
     *
     * Se registran como **entrada** (si se contó más de lo que dice el sistema) o **salida**, con
     * la nota del conteo para que quede en el historial y en la auditoría. Si el día está cerrado
     * o falta stock, el repositorio devuelve el error y se informa sin dejarlo a medias.
     */
    fun aplicar(actor: UserAccount, onFin: (String) -> Unit) {
        val pendientes = ajustes()
        if (pendientes.isEmpty()) {
            onFin("No hay diferencias que ajustar.")
            return
        }
        viewModelScope.launch {
            aplicando = true
            val fecha = LocalDate.now()
            val hoy = Dates.format(Dates.startOfDay(fecha))
            var hechos = 0
            var problema: String? = null
            for (l in pendientes) {
                val tipo = l.ajuste ?: continue
                val r = movements.register(
                    productId = l.productId,
                    type = tipo,
                    quantity = l.unidadesAjuste,
                    center = SaleCenter.TIENDA,
                    date = fecha,
                    actor = actor,
                    notes = ConteoFisico.notaAjuste(l, hoy)
                )
                when (r) {
                    is AppResult.Ok -> hechos++
                    is AppResult.Err -> {
                        problema = "${l.nombre}: ${r.message}"
                        break
                    }
                }
            }
            aplicando = false
            if (problema == null) {
                terminado = true
                lineas = ConteoFisico.reiniciar(lineas)
                message = "Conteo aplicado: $hechos ajuste(s) registrados."
                onFin("Conteo aplicado: $hechos ajuste(s) registrados.")
            } else {
                // Lo que se alcanzó a registrar ya está hecho: se recarga el catálogo para verse al día.
                lineas = runCatching { ConteoFisico.lineasDe(products.all()) }.getOrDefault(lineas)
                message = "Se aplicaron $hechos ajuste(s) y se detuvo: $problema"
                onFin(message!!)
            }
        }
    }
}

/**
 * Pantalla del conteo físico.
 *
 * Arriba el avance y los totales; en la lista, cada producto pendiente con lo que dice el
 * sistema y un campo para lo contado. El botón de la cámara abre el lector para ir sumando
 * unidades sin escribir.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConteoScreen(user: UserAccount, vm: ConteoViewModel = hiltViewModel()) {
    val context = LocalContext.current
    var escaneando by remember { mutableStateOf(false) }
    var q by remember { mutableStateOf("") }
    var soloPendientes by remember { mutableStateOf(true) }
    var contando by remember { mutableStateOf<Linea?>(null) }
    var confirmar by remember { mutableStateOf(false) }
    val aviso: (String) -> Unit = { Toast.makeText(context, it, Toast.LENGTH_SHORT).show() }

    val lineas = vm.lineas
    val desconocidos = vm.desconocidos
    val avance = vm.avance()
    val resumen = vm.resumen()
    val visibles = remember(lineas, q, soloPendientes) {
        val base = if (soloPendientes) lineas.filter { it.contado == null } else lineas
        ConteoFisico.buscar(base, q)
    }

    if (escaneando) {
        Box(Modifier.fillMaxSize()) {
            CameraScanner(
                onCodigo = { codigo -> vm.escanear(codigo) },
                onCerrar = { escaneando = false }
            )
            Column(
                Modifier.fillMaxWidth().padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Card {
                    Text(
                        vm.message ?: "Apunte al código del producto",
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
        return
    }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Conteo físico", style = MaterialTheme.typography.titleLarge)
        Text(avance.texto, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(resumen.texto, style = MaterialTheme.typography.bodySmall)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { escaneando = true }, enabled = !vm.aplicando) { Text("📷 Escanear") }
            OutlinedButton(onClick = { confirmar = true }, enabled = !vm.aplicando && resumen.ajustes > 0) {
                Text(if (vm.aplicando) "Aplicando…" else "Aplicar ${resumen.ajustes} ajuste(s)")
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = {
                val texto = vm.acta("NovaGest")
                val clip = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clip.setPrimaryClip(ClipData.newPlainText("Conteo físico", texto))
                aviso("Acta del conteo copiada")
            }) { Text("📋 Acta") }
            OutlinedButton(onClick = { aviso("El conteo se ha reiniciado. El inventario no cambió."); vm.reiniciar() }) {
                Text("Reiniciar")
            }
        }

        OutlinedTextField(
            value = q,
            onValueChange = { q = it },
            label = { Text("Buscar producto, código o categoría") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = soloPendientes,
                onClick = { soloPendientes = !soloPendientes },
                label = { Text(if (soloPendientes) "Solo pendientes (${avance.pendientes})" else "Todos (${lineas.size})") }
            )
            if (desconocidos.isNotEmpty()) {
                Text(
                    "${desconocidos.sumOf { it.veces }} lectura(s) sin producto",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        if (vm.cargando) {
            Text("Cargando el inventario…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(bottom = 24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(visibles, key = { it.productId }) { l ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(l.nombre, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "${l.categoria} · sistema ${Money.qty(l.esperado)} · ${l.estado.etiqueta}" +
                                if (l.contado != null) " · contado ${Money.qty(l.contado!!)} (${l.diferencia})" else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { contando = l }) { Text("Contar") }
                            if (l.contado != null) {
                                TextButton(onClick = { vm.fijar(l.productId, (l.contado ?: 0.0) + 1.0) }) { Text("+1") }
                                TextButton(onClick = { vm.fijar(l.productId, (l.contado ?: 0.0) - 1.0) }) { Text("−1") }
                            }
                        }
                    }
                }
            }
            if (visibles.isEmpty()) {
                item {
                    Text(
                        if (soloPendientes) "No queda nada por contar. Quite el filtro para revisar lo ya contado." else "Sin resultados.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    contando?.let { l ->
        var texto by remember(l.productId) { mutableStateOf(Money.qty(l.contado ?: l.esperado)) }
        AlertDialog(
            onDismissRequest = { contando = null },
            title = { Text(l.nombre) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("El sistema dice ${Money.qty(l.esperado)}. ¿Cuántas unidades hay de verdad?")
                    OutlinedTextField(
                        value = texto,
                        onValueChange = { texto = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                        label = { Text("Contado") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true
                    )
                    TextButton(onClick = {
                        vm.fijar(l.productId, null)
                        contando = null
                    }) { Text("Dejar sin contar") }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val v = texto.replace(',', '.').toDoubleOrNull()
                    if (v == null) aviso("Escriba un número") else {
                        vm.fijar(l.productId, v)
                        contando = null
                    }
                }) { Text("Guardar") }
            },
            dismissButton = { TextButton(onClick = { contando = null }) { Text("Cancelar") } }
        )
    }

    if (confirmar) {
        AlertDialog(
            onDismissRequest = { confirmar = false },
            title = { Text("Aplicar el conteo") },
            text = {
                Text(
                    "Se registrará un movimiento por cada diferencia: ${resumen.ajustes} ajuste(s) " +
                        "(${Money.qty(resumen.unidadesFaltantes)} de entrada y ${Money.qty(resumen.unidadesSobrantes)} de salida). " +
                        "Queda en el historial con su nombre."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmar = false
                    vm.aplicar(user) { msg -> aviso(msg) }
                }) { Text("Aplicar") }
            },
            dismissButton = { TextButton(onClick = { confirmar = false }) { Text("Cancelar") } }
        )
    }
}
