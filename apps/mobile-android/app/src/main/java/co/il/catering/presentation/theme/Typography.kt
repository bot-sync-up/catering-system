package co.il.catering.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.unit.sp
import co.il.catering.R

/**
 * Heebo - גופן עברי קריא ב-RTL. נטען דרך Google Fonts Downloadable.
 */
private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs,
)
private val heeboFont = GoogleFont("Heebo")

val HeeboFamily = FontFamily(
    Font(googleFont = heeboFont, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = heeboFont, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = heeboFont, fontProvider = provider, weight = FontWeight.Bold),
)

val HeeboTypography = Typography(
    displayLarge = TextStyle(fontFamily = HeeboFamily, fontWeight = FontWeight.Bold, fontSize = 32.sp),
    titleLarge = TextStyle(fontFamily = HeeboFamily, fontWeight = FontWeight.Medium, fontSize = 22.sp),
    titleMedium = TextStyle(fontFamily = HeeboFamily, fontWeight = FontWeight.Medium, fontSize = 18.sp),
    bodyLarge = TextStyle(fontFamily = HeeboFamily, fontSize = 16.sp),
    bodyMedium = TextStyle(fontFamily = HeeboFamily, fontSize = 14.sp),
    labelLarge = TextStyle(fontFamily = HeeboFamily, fontWeight = FontWeight.Medium, fontSize = 14.sp),
)
