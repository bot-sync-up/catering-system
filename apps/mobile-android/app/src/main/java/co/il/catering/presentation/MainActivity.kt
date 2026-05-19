package co.il.catering.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import co.il.catering.presentation.navigation.CateringNavHost
import co.il.catering.presentation.theme.CateringTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Activity יחיד - כל הניווט ב-Compose.
 * כופה כיווניות RTL ומציג את ה-NavHost לפי תפקיד המשתמש.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CateringTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    CateringNavHost()
                }
            }
        }
    }
}
