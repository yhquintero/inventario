package com.cuadrepinar.inventario.ui.backup

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.cuadrepinar.inventario.data.backup.BackupManager
import com.cuadrepinar.inventario.data.export.ExportManager
import com.cuadrepinar.inventario.domain.model.AppResult
import com.cuadrepinar.inventario.domain.model.UserAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

@HiltViewModel
class BackupViewModel @Inject constructor(
    val backups: BackupManager,
    val export: ExportManager
) : ViewModel()

@Composable
fun BackupScreen(user: UserAccount, vm: BackupViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val files = remember { vm.backups.listFiles() }
    val fmt = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("es", "CU"))
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Copias de seguridad", style = MaterialTheme.typography.headlineMedium)
        Text("Las copias se cifran con AES-GCM. El WorkManager programa una copia automática diaria.")
        Button(onClick = {
            scope.launch {
                when (val r = vm.backups.create(user, automatic = false)) {
                    is AppResult.Ok -> {
                        val uri = vm.export.uriFor(r.value)
                        context.startActivity(
                            Intent.createChooser(
                                Intent(Intent.ACTION_SEND).apply {
                                    type = "application/octet-stream"
                                    putExtra(Intent.EXTRA_STREAM, uri)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                },
                                "Compartir copia"
                            )
                        )
                    }
                    is AppResult.Err -> {}
                }
            }
        }, modifier = Modifier.fillMaxWidth()) { Text("Crear copia ahora") }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(files, key = { it.name }) { f ->
                Column(Modifier.padding(vertical = 6.dp)) {
                    Text(f.name, style = MaterialTheme.typography.titleMedium)
                    Text("${fmt.format(Date(f.lastModified()))} · ${f.length() / 1024} KB", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
