package com.novagest.inventario.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material3.Icon
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
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

/** Tarjeta KPI Nebula: borde con degradado, barra de acento, cifra luminosa y delta opcional. */
@Composable
fun KpiCard(
    title: String,
    value: String,
    subtitle: String = "",
    modifier: Modifier = Modifier,
    tone: Color = MaterialTheme.colorScheme.primary,
    icon: ImageVector? = null,
    delta: String? = null,
    deltaColor: Color? = null
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, Brush.linearGradient(listOf(tone.copy(alpha = 0.65f), tone.copy(alpha = 0.06f)))),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp, pressedElevation = 6.dp)
    ) {
        Box(Modifier.padding(14.dp)) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .width(26.dp)
                            .height(3.dp)
                            .background(Brush.horizontalGradient(listOf(tone, tone.copy(alpha = 0.25f))), RoundedCornerShape(99.dp))
                    )
                    Spacer(Modifier.weight(1f))
                    if (icon != null) {
                        Box(
                            Modifier
                                .size(30.dp)
                                .background(tone.copy(alpha = 0.14f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(icon, contentDescription = null, tint = tone, modifier = Modifier.size(17.dp))
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))
                Text(
                    value,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = tone,
                    // Con la fuente del sistema al 130 % la cifra se partía a mitad de número
                    // («$96,502.8» + «2»): una sola línea siempre.
                    maxLines = 1,
                    softWrap = false,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                if (subtitle.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (delta != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        delta,
                        style = MaterialTheme.typography.labelLarge,
                        color = deltaColor ?: tone
                    )
                }
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

/**
 * Fila de chips que se reparte en varias líneas cuando no cabe en el ancho del teléfono.
 *
 * Con un `Row` fijo, los últimos chips se comprimían hasta dibujar el texto letra a letra
 * en vertical (pasaba con «SALIDA» en Movimientos y con «3 meses»/«Permanente» en la
 * licencia). `FlowRow` conserva el ancho natural de cada chip y baja el resto de línea.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun <T> ChipRow(
    options: List<T>,
    selected: T?,
    label: (T) -> String,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        options.forEach { opt ->
            FilterChip(
                selected = opt == selected,
                onClick = { onSelect(opt) },
                label = { Text(label(opt)) }
            )
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
fun EmptyState(text: String, icon: ImageVector? = null) {
    Column(
        Modifier.fillMaxWidth().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        icon?.let {
            Box(
                Modifier.size(54.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(it, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(26.dp))
            }
        }
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
