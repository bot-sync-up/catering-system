package co.il.catering.presentation.screens.driver

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.usecase.CaptureSignatureUseCase
import co.il.catering.presentation.components.SignaturePad
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

@HiltViewModel
class SignatureViewModel @Inject constructor(
    private val capture: CaptureSignatureUseCase,
) : ViewModel() {
    fun upload(deliveryId: String, file: File, onDone: () -> Unit) {
        viewModelScope.launch {
            capture(deliveryId, file.absolutePath).onSuccess { onDone() }
        }
    }
}

@Composable
fun SignatureScreen(
    deliveryId: String,
    onDone: () -> Unit,
    vm: SignatureViewModel = hiltViewModel(),
) {
    val ctx = LocalContext.current
    var savedFile by remember { mutableStateOf<File?>(null) }
    Scaffold(topBar = { TopAppBar(title = { Text("חתימת לקוח") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("אנא חתום במסגרת:")
            SignaturePad(
                modifier = Modifier.fillMaxWidth().height(300.dp),
                onSaved = { file -> savedFile = file },
            )
            Button(
                onClick = {
                    savedFile?.let { vm.upload(deliveryId, it) { onDone() } }
                },
                enabled = savedFile != null,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("שלח חתימה") }
        }
    }
}
