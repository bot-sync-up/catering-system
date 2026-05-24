package co.il.catering.presentation.screens.agent

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
import co.il.catering.domain.model.Lead
import co.il.catering.domain.usecase.GetLeadsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CrmState(val leads: List<Lead> = emptyList(), val loading: Boolean = false, val error: String? = null)

@HiltViewModel
class CrmViewModel @Inject constructor(
    private val getLeads: GetLeadsUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(CrmState())
    val state: StateFlow<CrmState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            getLeads()
                .onSuccess { list -> _state.update { it.copy(leads = list, loading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, loading = false) } }
        }
    }
}

@Composable
fun CrmScreen(
    onLeadClick: (String) -> Unit,
    vm: CrmViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("ניהול לקוחות") }) }) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(state.leads, key = { it.id }) { lead ->
                    ElevatedCard(modifier = Modifier.fillMaxWidth().clickable { onLeadClick(lead.id) }) {
                        Column(Modifier.padding(12.dp)) {
                            Text(lead.name, style = MaterialTheme.typography.titleMedium)
                            Text("שלב: ${lead.stage.name}", style = MaterialTheme.typography.bodyMedium)
                            lead.phone?.let { Text("טל׳: $it") }
                        }
                    }
                }
            }
        }
    }
}
