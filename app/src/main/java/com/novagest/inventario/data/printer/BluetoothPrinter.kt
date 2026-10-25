package com.novagest.inventario.data.printer

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Impresora emparejada en el teléfono. */
data class PrinterDevice(val name: String, val address: String)

/**
 * Impresión en impresoras térmicas Bluetooth (perfil SPP).
 *
 * Solo se usan impresoras **ya emparejadas** desde los ajustes de Android: la
 * app no escanea dispositivos ni pide ubicación. El permiso `BLUETOOTH_CONNECT`
 * se solicita en pantalla la primera vez (Android 12 y posteriores).
 */
@Singleton
class BluetoothPrinter @Inject constructor(@ApplicationContext private val context: Context) {

    private val prefs = context.getSharedPreferences("printer", Context.MODE_PRIVATE)

    private val adapter: BluetoothAdapter?
        get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    /** ¿Hay permiso para hablar con la impresora? */
    fun hasPermission(): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED
    } else {
        true
    }

    /** Impresoras emparejadas, por nombre. */
    @SuppressLint("MissingPermission")
    fun paired(): List<PrinterDevice> {
        if (!hasPermission()) return emptyList()
        val a = adapter ?: return emptyList()
        return runCatching {
            a.bondedDevices.orEmpty()
                .map { PrinterDevice(it.name ?: it.address, it.address) }
                .sortedBy { it.name.lowercase() }
        }.getOrDefault(emptyList())
    }

    /** Última impresora usada (se recuerda entre sesiones). */
    var savedAddress: String
        get() = prefs.getString("address", "") ?: ""
        private set(value) { prefs.edit().putString("address", value).apply() }

    /**
     * Envía el ticket a la impresora.
     *
     * @param address dirección MAC; si viene vacía se usa la última usada o la
     *   primera emparejada.
     * @return `null` si se imprimió; si no, el motivo para mostrar al usuario.
     */
    suspend fun print(address: String, data: ByteArray): String? = withContext(Dispatchers.IO) {
        if (!hasPermission()) return@withContext "Falta el permiso de Bluetooth: acéptalo para poder imprimir."
        val a = adapter ?: return@withContext "Este equipo no tiene Bluetooth."
        val target = address.ifBlank { savedAddress.ifBlank { paired().firstOrNull()?.address ?: "" } }
        if (target.isBlank()) return@withContext "Empareja la impresora en los ajustes de Bluetooth del teléfono."

        var socket: BluetoothSocket? = null
        try {
            socket = a.getRemoteDevice(target).createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()
            socket.outputStream.write(data)
            socket.outputStream.flush()
            savedAddress = target
            null
        } catch (e: Exception) {
            "No se pudo imprimir: ${e.message ?: "revisa que la impresora esté encendida y emparejada"}"
        } finally {
            runCatching { socket?.close() }
        }
    }

    private companion object {
        /** UUID estándar del perfil serie (SPP) que usan las impresoras térmicas. */
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
}
