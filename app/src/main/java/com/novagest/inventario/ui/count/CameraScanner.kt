package com.novagest.inventario.ui.count

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.NotFoundException
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer
import java.util.concurrent.Executors

/**
 * A-20 · Lector de códigos con la cámara del teléfono.
 *
 * Abre la cámara trasera, mira el código de barras (o el QR) y avisa del texto leído. Se usa
 * en el **conteo físico guiado**: cada lectura suma una unidad al producto que tiene ese
 * código. Todo se decodifica **en el propio teléfono**: no hay red ni servicio de terceros.
 *
 * La primera vez Android pedirá el permiso de cámara; si se niega, la pantalla de conteo sigue
 * funcionando a mano.
 */
@Composable
fun CameraScanner(
    onCodigo: (String) -> Unit,
    onCerrar: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val actualOnCodigo by rememberUpdatedState(onCodigo)
    var permiso by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val pedirPermiso = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        permiso = concedido
    }

    if (!permiso) {
        Column(
            modifier = modifier.fillMaxWidth().padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Para contar con la cámara hace falta el permiso.", style = MaterialTheme.typography.bodyMedium)
            Text(
                "Sin cámara el conteo se hace igual: escriba la cantidad a mano en la lista.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Button(onClick = { pedirPermiso.launch(Manifest.permission.CAMERA) }) { Text("Permitir la cámara") }
            OutlinedButton(onClick = onCerrar) { Text("Volver a la lista") }
        }
        return
    }

    val executor = remember { Executors.newSingleThreadExecutor() }
    val reader = remember {
        MultiFormatReader().apply {
            setHints(
                mapOf(
                    DecodeHintType.POSSIBLE_FORMATS to listOf(
                        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
                        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
                        BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX
                    ),
                    DecodeHintType.TRY_HARDER to true
                )
            )
        }
    }
    // La cámara repite la misma lectura muchas veces por segundo: se avisa una vez cada 1,2 s.
    val ultimoCodigo = remember { arrayOf("") }
    val ultimoMs = remember { longArrayOf(0L) }

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }
                val futuro = ProcessCameraProvider.getInstance(ctx)
                futuro.addListener({
                    val provider = runCatching { futuro.get() }.getOrNull()
                    if (provider == null) return@addListener
                    val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
                    val analisis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                    analisis.setAnalyzer(executor) { proxy ->
                        try {
                            val texto = leerCodigo(proxy, reader)
                            if (texto != null) {
                                val ahora = System.currentTimeMillis()
                                if (texto != ultimoCodigo[0] || ahora - ultimoMs[0] > 1_200) {
                                    ultimoCodigo[0] = texto
                                    ultimoMs[0] = ahora
                                    Handler(Looper.getMainLooper()).post { actualOnCodigo(texto) }
                                }
                            }
                        } finally {
                            proxy.close()
                        }
                    }
                    runCatching {
                        provider.unbindAll()
                        provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analisis)
                    }
                }, ContextCompat.getMainExecutor(ctx))
                previewView
            }
        )
        Column(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "Apunte al código de barras del producto",
                color = Color.White,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                "Cada lectura suma una unidad. El conteo se guarda solo.",
                color = Color.White,
                style = MaterialTheme.typography.bodySmall
            )
            OutlinedButton(onClick = onCerrar) { Text("Terminar de escanear") }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            runCatching { ProcessCameraProvider.getInstance(context).get().unbindAll() }
            executor.shutdown()
        }
    }
}

/**
 * Decodifica el código de un fotograma. Prueba el fotograma tal cual y, si no hay suerte, girado
 * (los códigos de barras de una caja se leen muchas veces en vertical).
 */
private fun leerCodigo(proxy: ImageProxy, reader: MultiFormatReader): String? {
    val ancho = proxy.width
    val alto = proxy.height
    if (ancho <= 0 || alto <= 0) return null
    val plano = proxy.planes.firstOrNull() ?: return null
    val buffer = plano.buffer
    val filaStride = plano.rowStride
    val bytes = ByteArray(buffer.remaining())
    buffer.get(bytes)
    // Sin relleno al final de cada fila, ZXing puede leer el fotograma directamente.
    val datos = if (filaStride == ancho || bytes.size < filaStride * alto) bytes else {
        val limpio = ByteArray(ancho * alto)
        for (fila in 0 until alto) {
            System.arraycopy(bytes, fila * filaStride, limpio, fila * ancho, ancho)
        }
        limpio
    }
    val fuente = PlanarYUVLuminanceSource(datos, ancho, alto, 0, 0, ancho, alto, false)
    return intentar(fuente, reader) ?: intentar(fuente.rotateCounterClockwise(), reader)
}

private fun intentar(fuente: com.google.zxing.LuminanceSource, reader: MultiFormatReader): String? = try {
    reader.decodeWithState(BinaryBitmap(HybridBinarizer(fuente))).text
} catch (e: NotFoundException) {
    null
} catch (e: Exception) {
    null
} finally {
    reader.reset()
}
