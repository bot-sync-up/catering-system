package co.il.catering.presentation.screens.driver

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
import co.il.catering.domain.model.Delivery
import co.il.catering.domain.usecase.GetMyDeliveriesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DeliveriesViewModel @Inject constructor(
    private val getMy: GetMyDeliveriesUseCase,
) : ViewModel() {
    private val _items = MutableStateFlow<List<Delivery>>(emptyList())
    val items: StateFlow<List<Delivery>> = _items.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch {
        getMy().onSuccess { _items.value = it }
    }
}

@Composable
fun DeliveriesScreen(
    onNavigate: (String) -> Unit,
    onSignature: (String) -> Unit,
    vm: DeliveriesViewModel = hiltViewModel(),
) {
    val items by vm.items.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("המשלוחים שלי") }) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items, key = { it.id }) { d ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(d.address, style = MaterialTheme.typography.titleMedium)
                        Text("סטטוס: ${d.status.name}")
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { onNavigate(d.id) }) { Text("נווט") }
                            Button(onClick = { onSignature(d.id) }) { Text("חתימה") }
                        }
                    }
                }
            }
        }
    }
}
