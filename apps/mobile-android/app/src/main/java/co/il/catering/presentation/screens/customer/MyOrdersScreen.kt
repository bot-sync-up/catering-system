package co.il.catering.presentation.screens.customer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.Order
import co.il.catering.domain.usecase.GetTodayOrdersUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class CustomerOrdersViewModel @Inject constructor(
    private val getToday: GetTodayOrdersUseCase,
) : ViewModel() {
    val orders: StateFlow<List<Order>> = getToday()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}

@Composable
fun MyOrdersScreen(
    onNewOrder: () -> Unit,
    onOrderClick: (String) -> Unit,
    vm: CustomerOrdersViewModel = hiltViewModel(),
) {
    val orders by vm.orders.collectAsStateWithLifecycle()
    Scaffold(
        topBar = { TopAppBar(title = { Text("ההזמנות שלי") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onNewOrder) {
                Icon(Icons.Default.Add, contentDescription = "הזמנה חדשה")
            }
        },
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(orders, key = { it.id }) { o ->
                ElevatedCard(Modifier.fillMaxWidth().clickable { onOrderClick(o.id) }) {
                    Column(Modifier.padding(12.dp)) {
                        Text(o.customerName, style = MaterialTheme.typography.titleMedium)
                        Text("סטטוס: ${o.status.name}")
                        Text("סכום: ${o.totalAmount} ₪ (שולם ${o.paidAmount} ₪)")
                    }
                }
            }
        }
    }
}
