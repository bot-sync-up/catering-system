package co.il.catering.presentation.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.UserRole
import co.il.catering.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RootState(
    val loading: Boolean = true,
    val loggedIn: Boolean = false,
    val role: UserRole? = null,
)

@HiltViewModel
class RootViewModel @Inject constructor(
    private val authRepo: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RootState())
    val state: StateFlow<RootState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val logged = authRepo.isLoggedIn()
            val role = if (logged) authRepo.currentRole() else null
            _state.update { it.copy(loading = false, loggedIn = logged, role = role) }
        }
    }
}
