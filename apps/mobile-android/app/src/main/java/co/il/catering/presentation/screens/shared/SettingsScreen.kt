package co.il.catering.presentation.screens.shared

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.core.dnd.DndGate
import co.il.catering.core.i18n.RtlHelpers
import co.il.catering.domain.usecase.LogoutUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val logoutUseCase: LogoutUseCase,
    val dnd: DndGate,
) : ViewModel() {
    fun setDnd(enabled: Boolean) { viewModelScope.launch { dnd.setEnabled(enabled) } }
    fun setHours(start: Int, end: Int) { viewModelScope.launch { dnd.setHours(start, end) } }
    fun logout(onDone: () -> Unit) { viewModelScope.launch { logoutUseCase(); onDone() } }
}

@Composable
fun SettingsScreen(
    onLoggedOut: () -> Unit,
    vm: SettingsViewModel = hiltViewModel(),
) {
    var dndEnabled by remember { mutableStateOf(true) }
    var locale by remember { mutableStateOf(RtlHelpers.currentTag().ifBlank { "he" }) }
    Scaffold(topBar = { TopAppBar(title = { Text("הגדרות") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("שעות שקטות", style = MaterialTheme.typography.titleMedium)
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text("הפעל DND (22:00-08:00)", modifier = Modifier.weight(1f))
                        Switch(checked = dndEnabled, onCheckedChange = {
                            dndEnabled = it
                            vm.setDnd(it)
                        })
                    }
                }
            }
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("שפה", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = locale.startsWith("he"),
                            onClick = { locale = "he"; RtlHelpers.setAppLocale("he") },
                            label = { Text("עברית") })
                        FilterChip(selected = locale.startsWith("en"),
                            onClick = { locale = "en"; RtlHelpers.setAppLocale("en") },
                            label = { Text("English") })
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            OutlinedButton(
                onClick = { vm.logout(onLoggedOut) },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("התנתק") }
        }
    }
}
