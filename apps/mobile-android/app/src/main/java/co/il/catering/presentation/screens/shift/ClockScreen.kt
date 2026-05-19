package co.il.catering.presentation.screens.shift

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.core.location.LocationProvider
import co.il.catering.domain.usecase.ClockInUseCase
import co.il.catering.domain.usecase.ClockOutUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ClockViewModel @Inject constructor(
    private val clockIn: ClockInUseCase,
    private val clockOut: ClockOutUseCase,
    private val location: LocationProvider,
) : ViewModel() {
    private val _msg = MutableStateFlow<String?>(null)
    val msg: StateFlow<String?> = _msg.asStateFlow()
    private val _working = MutableStateFlow(false)
    val working: StateFlow<Boolean> = _working.asStateFlow()

    fun doClockIn(shiftId: String) = viewModelScope.launch {
        _working.value = true
        val loc = location.current()
        clockIn(shiftId, loc?.first, loc?.second)
            .onSuccess { _msg.value = "נכנסת למשמרת בהצלחה" }
            .onFailure { _msg.value = "שמרנו מקומית - יסונכרן" }
        _working.value = false
    }

    fun doClockOut(shiftId: String) = viewModelScope.launch {
        _working.value = true
        val loc = location.current()
        clockOut(shiftId, loc?.first, loc?.second)
            .onSuccess { _msg.value = "סיימת משמרת" }
            .onFailure { _msg.value = "נשמר מקומית - יסונכרן" }
        _working.value = false
    }
}

@Composable
fun ClockScreen(vm: ClockViewModel = hiltViewModel()) {
    val msg by vm.msg.collectAsStateWithLifecycle()
    val working by vm.working.collectAsStateWithLifecycle()

    val shiftId = "current"

    Scaffold(topBar = { TopAppBar(title = { Text("שעון נוכחות") }) }) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("היכן אתה?", style = MaterialTheme.typography.titleLarge)
            Button(onClick = { vm.doClockIn(shiftId) }, enabled = !working, modifier = Modifier.fillMaxWidth()) {
                Text("החתמת כניסה")
            }
            OutlinedButton(onClick = { vm.doClockOut(shiftId) }, enabled = !working, modifier = Modifier.fillMaxWidth()) {
                Text("החתמת יציאה")
            }
            msg?.let { Text(it) }
        }
    }
}
