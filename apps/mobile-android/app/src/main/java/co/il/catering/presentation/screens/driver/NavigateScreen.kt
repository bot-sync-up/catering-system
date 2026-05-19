package co.il.catering.presentation.screens.driver

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/**
 * מסך ניווט - פותח Waze או Google Maps עם הכתובת.
 */
@Composable
fun NavigateScreen(deliveryId: String) {
    val ctx = LocalContext.current
    Scaffold(topBar = { TopAppBar(title = { Text("ניווט - $deliveryId") }) }) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("בחר אפליקציית ניווט", style = MaterialTheme.typography.titleLarge)
            Button(
                onClick = {
                    val i = Intent(Intent.ACTION_VIEW, Uri.parse("waze://?q=delivery_$deliveryId&navigate=yes"))
                    runCatching { ctx.startActivity(i) }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("פתח ב-Waze") }
            OutlinedButton(
                onClick = {
                    val i = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=delivery_$deliveryId"))
                    i.setPackage("com.google.android.apps.maps")
                    runCatching { ctx.startActivity(i) }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("פתח ב-Google Maps") }
        }
    }
}
