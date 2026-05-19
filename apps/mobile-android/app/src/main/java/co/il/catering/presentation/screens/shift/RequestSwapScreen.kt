package co.il.catering.presentation.screens.shift

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RequestSwapViewModel @Inject constructor(
    private val repo: ShiftRepository,
) : ViewModel() {
    fun send(shiftId: String, reason: String, onDone: () -> Unit) = viewModelScope.launch {
        repo.requestSwap(shiftId, reason).onSuccess { onDone() }
    }
}

@Composable
fun RequestSwapScreen(
    shiftId: String,
    onSent: () -> Unit,
    vm: RequestSwapViewModel = hiltViewModel(),
) {
    var reason by remember { mutableStateOf("") }
    var working by remember { mutableStateOf(false) }
    Scaffold(topBar = { TopAppBar(title = { Text("בקשת החלפת משמרת") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("משמרת: $shiftId")
            OutlinedTextField(
                value = reason, onValueChange = { reason = it },
                label = { Text("סיבה") }, modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = {
                    working = true
                    vm.send(shiftId, reason) { onSent() }
                },
                enabled = !working && reason.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("שלח בקשה") }
        }
    }
}
