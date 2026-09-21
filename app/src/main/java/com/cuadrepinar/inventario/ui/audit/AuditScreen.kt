package com.cuadrepinar.inventario.ui.audit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cuadrepinar.inventario.data.repository.AuditRepository
import com.cuadrepinar.inventario.ui.components.SearchField
import com.cuadrepinar.inventario.util.Dates
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class AuditViewModel @Inject constructor(repo: AuditRepository) : ViewModel() {
    val logs = repo.observe().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

@Composable
fun AuditScreen(vm: AuditViewModel = hiltViewModel()) {
    val logs by vm.logs.collectAsState()
    var q by remember { mutableStateOf("") }
    val fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
    val filtered = logs.filter {
        q.isBlank() || it.action.contains(q, true) || it.userName.contains(q, true) || it.details.contains(q, true)
    }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Registro de auditoría", style = MaterialTheme.typography.headlineMedium) }
        item { SearchField(q, { q = it }, "Buscar por usuario, acción o detalle") }
        items(filtered, key = { it.id }) { e ->
            Column(Modifier.padding(vertical = 4.dp)) {
                Text("${e.action} · ${e.userName}", style = MaterialTheme.typography.titleMedium)
                Text(e.details, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    Instant.ofEpochMilli(e.timestamp).atZone(ZoneId.systemDefault()).format(fmt),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
