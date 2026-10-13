package com.novagest.inventario.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.novagest.inventario.domain.model.Permission
import com.novagest.inventario.domain.model.Role
import com.novagest.inventario.domain.model.RolePermissions

/** Tarjeta KPI con barra de acento y cifra coloreada por tono (índigo, esmeralda, ámbar…). */
@Composable
fun KpiCard(
    title: String,
    value: String,
    subtitle: String = "",
    modifier: Modifier = Modifier,
    tone: Color = MaterialTheme.colorScheme.primary
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(
                Modifier
                    .width(28.dp)
                    .height(3.dp)
                    .background(tone, RoundedCornerShape(99.dp))
            )
            Spacer(Modifier.height(10.dp))
            Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold, color = tone)
            if (subtitle.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun SearchField(value: String, onChange: (String) -> Unit, label: String, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun RoleGate(role: Role, permission: Permission, content: @Composable () -> Unit) {
    if (RolePermissions.can(role, permission)) content()
}

@Composable
fun ChipRow(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        options.forEach { opt ->
            FilterChip(selected = selected == opt, onClick = { onSelect(opt) }, label = { Text(opt) })
            Spacer(Modifier.width(0.dp))
        }
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@Composable
fun EmptyState(text: String) {
    Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(24.dp))
}
