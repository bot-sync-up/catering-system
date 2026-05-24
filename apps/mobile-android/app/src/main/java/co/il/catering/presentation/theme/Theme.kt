package co.il.catering.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BrandOrange = Color(0xFFFF6B35)
private val BrandBlue = Color(0xFF004E89)
private val Surface = Color(0xFFFFFBF5)
private val OnSurface = Color(0xFF1F1B16)

private val Light = lightColorScheme(
    primary = BrandOrange,
    onPrimary = Color.White,
    secondary = BrandBlue,
    onSecondary = Color.White,
    surface = Surface,
    onSurface = OnSurface,
)

private val Dark = darkColorScheme(
    primary = BrandOrange,
    onPrimary = Color.White,
    secondary = BrandBlue,
    onSecondary = Color.White,
)

@Composable
fun CateringTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val scheme = if (darkTheme) Dark else Light
    MaterialTheme(
        colorScheme = scheme,
        typography = HeeboTypography,
        content = content,
    )
}
