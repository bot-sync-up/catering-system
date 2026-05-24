package co.il.catering.presentation.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import co.il.catering.core.auth.BiometricAuthenticator
import kotlinx.coroutines.launch

@Composable
fun BiometricScreen(onSuccess: () -> Unit) {
    val ctx = LocalContext.current
    val activity = ctx as? FragmentActivity
    var error by remember { mutableStateOf<String?>(null) }
    val authenticator = remember { BiometricAuthenticator(ctx) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("אימות ביומטרי", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(24.dp))
        Button(onClick = {
            if (activity == null) { error = "Activity לא תקין"; return@Button }
            scope.launch {
                val ok = authenticator.authenticate(
                    activity,
                    "אימות זהות",
                    "אנא אמת בעזרת טביעת אצבע / Face Unlock",
                )
                if (ok) onSuccess() else error = "אימות נכשל"
            }
        }) { Text("הוכח שזה אתה") }
        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
    }
}
