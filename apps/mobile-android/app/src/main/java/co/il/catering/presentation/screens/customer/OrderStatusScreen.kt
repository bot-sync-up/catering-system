package co.il.catering.presentation.screens.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.Order
import co.il.catering.domain.repository.OrdersRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class OrderStatusViewModel @Inject constructor(
    handle: SavedStateHandle,
    repo: OrdersRepository,
) : ViewModel() {
    private val orderId: String = handle["orderId"] ?: ""
    val order: StateFlow<Order?> = repo.observe(orderId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
}

@Composable
fun OrderStatusScreen(
    orderId: String,
    vm: OrderStatusViewModel = hiltViewModel(),
) {
    val order by vm.order.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("סטטוס הזמנה") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val o = order
            if (o == null) {
                CircularProgressIndicator()
            } else {
                Text(o.customerName, style = MaterialTheme.typography.titleLarge)
                LinearProgressIndicator(
                    progress = { progressFor(o.status.name) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("שלב נוכחי: ${o.status.name}")
                Text("סכום: ${o.totalAmount} ₪")
            }
        }
    }
}

private fun progressFor(status: String): Float = when (status) {
    "PENDING" -> 0.1f
    "CONFIRMED" -> 0.3f
    "IN_PREP" -> 0.5f
    "ON_ROUTE" -> 0.8f
    "DELIVERED" -> 1f
    else -> 0f
}
