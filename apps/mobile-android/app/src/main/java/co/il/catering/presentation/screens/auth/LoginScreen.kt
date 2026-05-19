package co.il.catering.presentation.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import co.il.catering.domain.model.UserRole
import co.il.catering.domain.usecase.LoginUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginState(
    val email: String = "",
    val password: String = "",
    val otp: String = "",
    val otpRequired: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null,
    val role: UserRole? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    fun setEmail(v: String) = _state.update { it.copy(email = v, error = null) }
    fun setPassword(v: String) = _state.update { it.copy(password = v, error = null) }
    fun setOtp(v: String) = _state.update { it.copy(otp = v, error = null) }

    fun submit(onSuccess: (UserRole) -> Unit) {
        val s = _state.value
        if (s.email.isBlank() || s.password.isBlank()) {
            _state.update { it.copy(error = "אנא מלא דוא״ל וסיסמה") }
            return
        }
        _state.update { it.copy(loading = true) }
        viewModelScope.launch {
            loginUseCase(s.email, s.password, s.otp.takeIf { it.isNotBlank() })
                .onSuccess { user ->
                    _state.update { it.copy(loading = false, role = user.role) }
                    onSuccess(user.role)
                }
                .onFailure { e ->
                    _state.update { it.copy(loading = false, error = e.message ?: "שגיאה") }
                }
        }
    }
}

@Composable
fun LoginScreen(
    onLoggedIn: (UserRole) -> Unit,
    vm: LoginViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("כניסה למערכת") }) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("ברוכים הבאים", style = MaterialTheme.typography.titleLarge)
            OutlinedTextField(
                value = state.email, onValueChange = vm::setEmail,
                label = { Text("דוא״ל") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.password, onValueChange = vm::setPassword,
                label = { Text("סיסמה") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            if (state.otpRequired) {
                OutlinedTextField(
                    value = state.otp, onValueChange = vm::setOtp,
                    label = { Text("קוד אימות") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
            Button(
                onClick = { vm.submit(onLoggedIn) },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.loading) CircularProgressIndicator(modifier = Modifier.size(20.dp))
                else Text("התחבר")
            }
        }
    }
}
