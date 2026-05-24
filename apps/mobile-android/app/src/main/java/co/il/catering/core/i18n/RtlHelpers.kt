package co.il.catering.core.i18n

import android.content.Context
import androidx.core.os.LocaleListCompat
import androidx.appcompat.app.AppCompatDelegate

/**
 * עזרים לעברית/RTL. לקריאה מהגדרות.
 */
object RtlHelpers {
    fun setAppLocale(tag: String) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
    }
    fun currentTag(): String =
        AppCompatDelegate.getApplicationLocales().toLanguageTags().ifBlank { "he" }

    fun isRtl(context: Context): Boolean =
        context.resources.configuration.layoutDirection == android.view.View.LAYOUT_DIRECTION_RTL
}
