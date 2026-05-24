package co.il.catering.core.network

import co.il.catering.core.auth.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Interceptor שמצרף JWT Bearer לכל בקשה (אלא אם זו בקשת login).
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.url.encodedPath.contains("/auth/")) {
            return chain.proceed(original)
        }
        val token = runBlocking { tokenStore.accessToken() }
        val request = if (token.isNullOrBlank()) {
            original
        } else {
            original.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        }
        return chain.proceed(request)
    }
}
