package co.il.catering.core.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "catering_secure_prefs")

/**
 * אחסון בטוח של access/refresh tokens.
 * משתמש ב-EncryptedSharedPreferences למפתחות + DataStore לערכים.
 */
@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val accessKey = stringPreferencesKey("access_token")
    private val refreshKey = stringPreferencesKey("refresh_token")
    private val roleKey = stringPreferencesKey("role")
    private val userIdKey = stringPreferencesKey("user_id")

    private val encrypted by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "catering_encrypted",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    suspend fun save(access: String, refresh: String, role: String? = null, userId: String? = null) {
        encrypted.edit()
            .putString("access", access)
            .putString("refresh", refresh)
            .apply()
        context.dataStore.edit { prefs ->
            prefs[accessKey] = access
            prefs[refreshKey] = refresh
            role?.let { prefs[roleKey] = it }
            userId?.let { prefs[userIdKey] = it }
        }
    }

    suspend fun accessToken(): String? =
        context.dataStore.data.map { it[accessKey] }.first() ?: encrypted.getString("access", null)

    suspend fun refreshToken(): String? =
        context.dataStore.data.map { it[refreshKey] }.first() ?: encrypted.getString("refresh", null)

    suspend fun role(): String? = context.dataStore.data.map { it[roleKey] }.first()

    suspend fun userId(): String? = context.dataStore.data.map { it[userIdKey] }.first()

    suspend fun clear() {
        encrypted.edit().clear().apply()
        context.dataStore.edit { it.clear() }
    }
}
