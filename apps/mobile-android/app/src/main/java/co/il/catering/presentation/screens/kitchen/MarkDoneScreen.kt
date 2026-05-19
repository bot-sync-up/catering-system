package co.il.catering.presentation.screens.kitchen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.usecase.MarkPrepDoneUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MarkDoneViewModel @Inject constructor(
    private val markPrep: MarkPrepDoneUseCase,
) : ViewModel() {
    fun mark(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            markPrep(id).onSuccess { onDone() }
        }
    }
}

@Composable
fun MarkDoneScreen(
    taskId: String,
    onDone: () -> Unit,
    vm: MarkDoneViewModel = hiltViewModel(),
) {
    var working by remember { mutableStateOf(false) }
    Scaffold(topBar = { TopAppBar(title = { Text("סימון משימה") }) }) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("האם להשלים את משימה $taskId?", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    working = true
                    vm.mark(taskId) { onDone() }
                },
                enabled = !working,
            ) { Text("סמן כהושלם") }
        }
    }
}
