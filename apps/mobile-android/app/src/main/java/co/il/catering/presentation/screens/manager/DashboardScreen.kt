package co.il.catering.presentation.screens.manager

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import co.il.catering.domain.model.Order
import co.il.catering.domain.usecase.GetTodayOrdersUseCase
import co.il.catering.presentation.navigation.Routes
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val getTodayOrders: GetTodayOrdersUseCase,
) : ViewModel() {
    val orders: StateFlow<List<Order>> = getTodayOrders()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            runCatching { getTodayOrders.refresh() }
            _refreshing.value = false
        }
    }

    init { refresh() }
}

@Composable
fun DashboardScreen(
    nav: NavController,
    vm: DashboardViewModel = hiltViewModel(),
) {
    val orders by vm.orders.collectAsStateWithLifecycle()
    val refreshing by vm.refreshing.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("לוח בקרה") },
                actions = {
                    IconButton(onClick = { vm.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "רענן")
                    }
                    IconButton(onClick = { nav.navigate(Routes.SETTINGS) }) {
                        Text("⚙")
                    }
                },
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            StatsRow(orders.size)
            if (refreshing) LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(orders, key = { it.id }) { order -> OrderCard(order) }
            }
        }
    }
}

@Composable
private fun StatsRow(todayCount: Int) {
    Row(
        Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        StatCard("הזמנות היום", "$todayCount", Modifier.weight(1f))
        StatCard("משימות פתוחות", "—", Modifier.weight(1f))
        StatCard("תשלומים ממתינים", "—", Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.padding(12.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge)
            Text(value, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun OrderCard(order: Order) {
    ElevatedCard {
        Column(Modifier.padding(12.dp)) {
            Text(order.customerName, style = MaterialTheme.typography.titleMedium)
            Text("סטטוס: ${order.status.name}", style = MaterialTheme.typography.bodyMedium)
            Text("סך: ${order.totalAmount} ₪", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
