package co.il.catering.core.dnd

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.time.LocalTime
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dndStore by preferencesDataStore("dnd_prefs")

/**
 * שעות שקטות. ברירת מחדל 22:00-08:00.
 * רק התראות גידור (geofence) עוברות גם בשעות שקטות.
 */
@Singleton
class DndGate @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val enabledKey = booleanPreferencesKey("dnd_enabled")
    private val startKey = intPreferencesKey("dnd_start_hour")
    private val endKey = intPreferencesKey("dnd_end_hour")

    fun isQuietNow(): Boolean = runBlocking {
        val enabled = context.dndStore.data.map { it[enabledKey] ?: true }.first()
        if (!enabled) return@runBlocking false
        val startH = context.dndStore.data.map { it[startKey] ?: 22 }.first()
        val endH = context.dndStore.data.map { it[endKey] ?: 8 }.first()
        val now = LocalTime.now().hour
        if (startH < endH) now in startH until endH
        else now >= startH || now < endH
    }

    suspend fun setEnabled(enabled: Boolean) {
        context.dndStore.edit { it[enabledKey] = enabled }
    }

    suspend fun setHours(startHour: Int, endHour: Int) {
        context.dndStore.edit {
            it[startKey] = startHour
            it[endKey] = endHour
        }
    }
}
