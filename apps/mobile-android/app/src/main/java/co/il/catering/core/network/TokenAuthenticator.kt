package co.il.catering.core.network

import co.il.catering.core.auth.TokenStore
import co.il.catering.data.remote.AuthApi
import dagger.Lazy
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Singleton

/**
 * מטפל ב-401: מנסה לרענן את ה-token, אם נכשל - מתנתק.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenStore: TokenStore,
    private val authApi: Lazy<AuthApi>,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = runBlocking { tokenStore.refreshToken() } ?: return null
        val refreshed = runBlocking {
            try {
                authApi.get().refresh(mapOf("refreshToken" to refresh))
            } catch (_: Throwable) {
                null
            }
        } ?: run {
            runBlocking { tokenStore.clear() }
            return null
        }
        runBlocking { tokenStore.save(refreshed.accessToken, refreshed.refreshToken) }
        return response.request.newBuilder()
            .header("Authorization", "Bearer ${refreshed.accessToken}")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var r: Response? = response
        var count = 1
        while (r?.priorResponse != null) {
            count++
            r = r.priorResponse
        }
        return count
    }
}
