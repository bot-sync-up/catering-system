package co.il.catering.presentation.screens.shared

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * סורק ברקודים. השימוש ב-ML Kit ScannerClient ייושם
 * דרך GmsBarcodeScanning.getClient. כאן UI bones.
 */
@Composable
fun BarcodeScannerScreen(onScanned: (String) -> Unit) {
    var lastCode by remember { mutableStateOf<String?>(null) }
    Scaffold(topBar = { TopAppBar(title = { Text("סריקת ברקוד") }) }) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("התקרב לברקוד כדי לסרוק")
            Spacer(Modifier.height(16.dp))
            Button(onClick = {
                // TODO: GmsBarcodeScanning.getClient(context).startScan() -> Task<Barcode>
                lastCode = "1234567890"
                onScanned("1234567890")
            }) { Text("סרוק (סימולציה)") }
            lastCode?.let { Text("נסרק: $it") }
        }
    }
}
