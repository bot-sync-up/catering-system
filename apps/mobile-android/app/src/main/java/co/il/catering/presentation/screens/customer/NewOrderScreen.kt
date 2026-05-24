package co.il.catering.presentation.screens.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.Order
import co.il.catering.domain.model.OrderStatus
import co.il.catering.domain.repository.OrdersRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

@HiltViewModel
class NewOrderViewModel @Inject constructor(
    private val repo: OrdersRepository,
) : ViewModel() {
    fun create(name: String, total: Double, notes: String?, onCreated: () -> Unit) {
        viewModelScope.launch {
            val order = Order(
                id = "local_${System.currentTimeMillis()}",
                customerId = "self",
                customerName = name,
                eventDate = Instant.now().plusSeconds(86_400),
                status = OrderStatus.PENDING,
                totalAmount = total,
                paidAmount = 0.0,
                address = null,
                notes = notes,
            )
            repo.create(order).onSuccess { onCreated() }
        }
    }
}

@Composable
fun NewOrderScreen(
    onCreated: () -> Unit,
    vm: NewOrderViewModel = hiltViewModel(),
) {
    var name by remember { mutableStateOf("") }
    var total by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    Scaffold(topBar = { TopAppBar(title = { Text("הזמנה חדשה") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = name, onValueChange = { name = it },
                label = { Text("שם לקוח") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = total, onValueChange = { total = it },
                label = { Text("סכום (₪)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = notes, onValueChange = { notes = it },
                label = { Text("הערות") }, modifier = Modifier.fillMaxWidth())
            Button(
                onClick = {
                    val amount = total.toDoubleOrNull() ?: 0.0
                    vm.create(name, amount, notes.ifBlank { null }) { onCreated() }
                },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("צור הזמנה") }
        }
    }
}
