package com.cuadrepinar.inventario.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.PointOfSale
import androidx.compose.material.icons.outlined.Timeline
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.runtime.collectAsState
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Brightness6
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Backup
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cuadrepinar.inventario.domain.model.Permission
import com.cuadrepinar.inventario.domain.model.Role
import com.cuadrepinar.inventario.domain.model.RolePermissions
import com.cuadrepinar.inventario.domain.model.UserAccount
import com.cuadrepinar.inventario.ui.audit.AuditScreen
import com.cuadrepinar.inventario.ui.backup.BackupScreen
import com.cuadrepinar.inventario.ui.cuadre.CuadreScreen
import com.cuadrepinar.inventario.ui.finance.FinanceScreen
import com.cuadrepinar.inventario.ui.home.HomeScreen
import com.cuadrepinar.inventario.ui.inventory.InventoryScreen
import com.cuadrepinar.inventario.ui.movements.MovementsScreen
import com.cuadrepinar.inventario.ui.reports.ReportsScreen
import com.cuadrepinar.inventario.ui.settings.SettingsScreen
import com.cuadrepinar.inventario.ui.users.UsersScreen
import kotlinx.coroutines.launch

sealed class Dest(val route: String, val label: String, val icon: ImageVector, val permission: Permission? = null) {
    data object Home : Dest("home", "Inicio", Icons.Outlined.Home)
    data object Inventory : Dest("inventory", "Inventario", Icons.Outlined.Inventory2, Permission.INVENTORY_VIEW)
    data object Movements : Dest("movements", "Movimientos", Icons.Outlined.SwapHoriz, Permission.MOVEMENT_VIEW)
    data object Reports : Dest("reports", "Reportes", Icons.Outlined.Assessment, Permission.REPORTS_VIEW)
    data object Cuadre : Dest("cuadre", "Cuadre", Icons.Outlined.ReceiptLong, Permission.CUADRE_VIEW)
    data object Finance : Dest("finance", "Finanzas", Icons.Outlined.AccountBalance, Permission.REPORTS_FINANCIAL)
    data object Users : Dest("users", "Usuarios", Icons.Outlined.People, Permission.USERS_VIEW)
    data object Audit : Dest("audit", "Auditoría", Icons.Outlined.History, Permission.AUDIT_VIEW)
    data object Backup : Dest("backup", "Copias", Icons.Outlined.Backup, Permission.BACKUP_MANAGE)
    data object Settings : Dest("settings", "Ajustes", Icons.Outlined.Settings)
    data object Pos : Dest("pos", "Vender", Icons.Outlined.PointOfSale, Permission.MOVEMENT_CREATE)
    data object Trash : Dest("trash", "Papelera", Icons.Outlined.DeleteOutline, Permission.INVENTORY_EDIT)
    data object History : Dest("history", "Historial precios", Icons.Outlined.Timeline, Permission.INVENTORY_VIEW)
}

private val bottom = listOf(Dest.Home, Dest.Pos, Dest.Inventory, Dest.Movements)
private val drawer = listOf(Dest.Reports, Dest.History, Dest.Trash, Dest.Cuadre, Dest.Finance, Dest.Users, Dest.Audit, Dest.Backup, Dest.Settings)

@OptIn(ExperimentalMaterial3Api::class)
@dagger.hilt.android.lifecycle.HiltViewModel
class SyncStatusViewModel @javax.inject.Inject constructor(val sync: com.cuadrepinar.inventario.data.sync.SyncManager) : androidx.lifecycle.ViewModel()

@Composable
fun AppShell(
    user: UserAccount,
    themeMode: String,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit
) {
    val nav = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val back by nav.currentBackStackEntryAsState()
    val current = back?.destination?.route

    fun allowed(d: Dest) = d.permission == null || RolePermissions.can(user.role, d.permission)
    val syncVm: SyncStatusViewModel = androidx.hilt.navigation.compose.hiltViewModel()
    val sync by syncVm.sync.status.collectAsState()
    val snackbar = androidx.compose.runtime.remember { androidx.compose.material3.SnackbarHostState() }
    androidx.compose.runtime.LaunchedEffect(sync.message) {
        sync.message?.takeIf { !it.startsWith("Datos al día") && !it.startsWith("Guardado") }?.let { snackbar.showSnackbar(it) }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Text(
                    "Cuadre Pinar",
                    modifier = Modifier.padding(24.dp),
                    style = androidx.compose.material3.MaterialTheme.typography.titleLarge
                )
                Text(
                    "${user.displayName} · ${user.role.label}",
                    modifier = Modifier.padding(horizontal = 24.dp),
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                )
                androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
                (bottom + drawer).filter(::allowed).forEach { d ->
                    NavigationDrawerItem(
                        label = { Text(d.label) },
                        selected = current == d.route,
                        icon = { Icon(d.icon, d.label) },
                        onClick = {
                            nav.navigate(d.route) {
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                            scope.launch { drawerState.close() }
                        }
                    )
                }
                NavigationDrawerItem(
                    label = { Text("Cerrar sesión") },
                    selected = false,
                    icon = { Icon(Icons.Outlined.Logout, null) },
                    onClick = onLogout
                )
            }
        }
    ) {
        Scaffold(
            snackbarHost = { androidx.compose.material3.SnackbarHost(snackbar) },
            topBar = {
                TopAppBar(
                    title = { Text("Cuadre Pinar") },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Outlined.Menu, "Menú")
                        }
                    },
                    actions = {
                        if (syncVm.sync.server().isNotBlank()) {
                            IconButton(onClick = { syncVm.sync.syncNow() }) {
                                Icon(
                                    when {
                                        !sync.connected -> Icons.Outlined.CloudOff
                                        sync.busy -> Icons.Outlined.CloudSync
                                        else -> Icons.Outlined.CloudDone
                                    },
                                    if (sync.connected) "Sincronizado con el servidor" else "Sin conexión con el servidor"
                                )
                            }
                        }
                        IconButton(onClick = onToggleTheme) { Icon(Icons.Outlined.Brightness6, "Tema") }
                    }
                )
            },
            bottomBar = {
                NavigationBar {
                    bottom.filter(::allowed).forEach { d ->
                        NavigationBarItem(
                            selected = current == d.route,
                            onClick = {
                                nav.navigate(d.route) {
                                    popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(d.icon, d.label) },
                            label = { Text(d.label) }
                        )
                    }
                }
            }
        ) { padding ->
            NavHost(nav, startDestination = Dest.Home.route, modifier = Modifier.padding(padding)) {
                composable(Dest.Home.route) { HomeScreen(user) }
                composable(Dest.Inventory.route) { InventoryScreen(user) }
                composable(Dest.Movements.route) { MovementsScreen(user) }
                composable(Dest.Reports.route) { ReportsScreen(user) }
                composable(Dest.Cuadre.route) { CuadreScreen(user) }
                composable(Dest.Finance.route) { FinanceScreen(user) }
                composable(Dest.Users.route) { UsersScreen(user) }
                composable(Dest.Audit.route) { AuditScreen() }
                composable(Dest.Backup.route) { BackupScreen(user) }
                composable(Dest.Settings.route) { SettingsScreen(user, themeMode) }
                composable(Dest.Pos.route) { com.cuadrepinar.inventario.ui.pos.PosScreen(user) }
                composable(Dest.Trash.route) { com.cuadrepinar.inventario.ui.trash.TrashScreen(user) }
                composable(Dest.History.route) { com.cuadrepinar.inventario.ui.history.PriceHistoryScreen() }
            }
        }
    }
}
