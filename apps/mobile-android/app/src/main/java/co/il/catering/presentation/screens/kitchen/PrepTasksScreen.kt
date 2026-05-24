package co.il.catering.presentation.screens.kitchen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.PrepTask
import co.il.catering.domain.usecase.GetPrepTasksUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PrepTasksViewModel @Inject constructor(
    private val getPrep: GetPrepTasksUseCase,
) : ViewModel() {
    private val _tasks = MutableStateFlow<List<PrepTask>>(emptyList())
    val tasks: StateFlow<List<PrepTask>> = _tasks.asStateFlow()
    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    init { refresh() }

    fun refresh() {
        _loading.value = true
        viewModelScope.launch {
            getPrep().onSuccess { _tasks.value = it }
            _loading.value = false
        }
    }
}

@Composable
fun PrepTasksScreen(
    onTaskClick: (String) -> Unit,
    vm: PrepTasksViewModel = hiltViewModel(),
) {
    val tasks by vm.tasks.collectAsStateWithLifecycle()
    val loading by vm.loading.collectAsStateWithLifecycle()

    Scaffold(topBar = { TopAppBar(title = { Text("משימות הכנה") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(tasks, key = { it.id }) { t ->
                    ElevatedCard(modifier = Modifier.fillMaxWidth().clickable { onTaskClick(t.id) }) {
                        Column(Modifier.padding(12.dp)) {
                            Text(t.item, style = MaterialTheme.typography.titleMedium)
                            Text("${t.quantity} ${t.unit}", style = MaterialTheme.typography.bodyMedium)
                            Text("סטטוס: ${t.status.name}")
                        }
                    }
                }
            }
        }
    }
}
