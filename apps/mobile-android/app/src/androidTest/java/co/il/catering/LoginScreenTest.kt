package co.il.catering

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import co.il.catering.presentation.screens.auth.LoginScreen
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test

@HiltAndroidTest
class LoginScreenTest {
    @get:Rule(order = 0) val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1) val composeRule = createComposeRule()

    @Test
    fun shows_login_form() {
        composeRule.setContent {
            LoginScreen(onLoggedIn = {})
        }
        composeRule.onNodeWithText("דוא״ל").assertIsDisplayed()
        composeRule.onNodeWithText("סיסמה").assertIsDisplayed()
        composeRule.onNodeWithText("התחבר").assertIsDisplayed()
    }
}
