package co.il.catering.presentation.screens.shared

import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.core.camera.CameraXManager
import co.il.catering.data.remote.InvoiceOcrResult
import co.il.catering.domain.usecase.ScanInvoiceOcrUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CameraOcrViewModel @Inject constructor(
    val cameraManager: CameraXManager,
    private val scanInvoice: ScanInvoiceOcrUseCase,
) : ViewModel() {
    private val _result = MutableStateFlow<InvoiceOcrResult?>(null)
    val result: StateFlow<InvoiceOcrResult?> = _result.asStateFlow()
    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    fun capture() = viewModelScope.launch {
        _busy.value = true
        runCatching {
            val cap = cameraManager.capture()
            scanInvoice(cap.file.absolutePath).getOrNull()
        }.getOrNull()?.let { _result.value = it }
        _busy.value = false
    }
}

@Composable
fun CameraOcrScreen(
    onResult: () -> Unit,
    vm: CameraOcrViewModel = hiltViewModel(),
) {
    val ctx = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val result by vm.result.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    var bound by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopAppBar(title = { Text("סריקת חשבונית") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            AndroidView(
                factory = { c ->
                    PreviewView(c).also { pv ->
                        kotlinx.coroutines.GlobalScope.launch {
                            if (!bound) {
                                vm.cameraManager.bind(lifecycleOwner) { preview ->
                                    preview.setSurfaceProvider(pv.surfaceProvider)
                                }
                                bound = true
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().weight(1f),
            )
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { vm.capture() },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (busy) "מנתח..." else "צלם ונתח") }
                result?.let {
                    Text("ספק: ${it.supplierName ?: "—"}")
                    Text("חשבונית: ${it.invoiceNumber ?: "—"}")
                    Text("סכום: ${it.totalAmount ?: "—"}")
                    OutlinedButton(onClick = onResult, modifier = Modifier.fillMaxWidth()) {
                        Text("אישור")
                    }
                }
            }
        }
    }
}

