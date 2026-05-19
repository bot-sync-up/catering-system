package co.il.catering.presentation.screens.shift

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
import co.il.catering.domain.model.Shift
import co.il.catering.domain.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MyShiftsViewModel @Inject constructor(
    private val repo: ShiftRepository,
) : ViewModel() {
    private val _shifts = MutableStateFlow<List<Shift>>(emptyList())
    val shifts: StateFlow<List<Shift>> = _shifts.asStateFlow()
    init { viewModelScope.launch { repo.mine().onSuccess { _shifts.value = it } } }
}

@Composable
fun MyShiftsScreen(
    onSwap: (String) -> Unit,
    vm: MyShiftsViewModel = hiltViewModel(),
) {
    val shifts by vm.shifts.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("המשמרות שלי") }) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(shifts, key = { it.id }) { s ->
                ElevatedCard(Modifier.fillMaxWidth().clickable { onSwap(s.id) }) {
                    Column(Modifier.padding(12.dp)) {
                        Text("משמרת ${s.role.name}", style = MaterialTheme.typography.titleMedium)
                        Text("התחלה: ${s.startsAt}")
                        Text("סיום: ${s.endsAt}")
                    }
                }
            }
        }
    }
}
