package co.il.catering.data.repository

import co.il.catering.core.auth.TokenStore
import co.il.catering.data.remote.AuthApi
import co.il.catering.data.remote.LoginRequest
import co.il.catering.domain.model.User
import co.il.catering.domain.model.UserRole
import co.il.catering.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val tokenStore: TokenStore,
) : AuthRepository {

    override suspend fun login(email: String, password: String, otp: String?): Result<User> =
        runCatching {
            val resp = authApi.login(LoginRequest(email, password, otp))
            tokenStore.save(resp.accessToken, resp.refreshToken, resp.role, resp.userId)
            User(
                id = resp.userId,
                email = email,
                displayName = email.substringBefore('@'),
                role = runCatching { UserRole.valueOf(resp.role.uppercase()) }.getOrDefault(UserRole.SHIFT),
            )
        }

    override suspend fun logout() {
        runCatching { authApi.logout() }
        tokenStore.clear()
    }

    override suspend fun currentRole(): UserRole? =
        tokenStore.role()?.let { runCatching { UserRole.valueOf(it.uppercase()) }.getOrNull() }

    override suspend fun currentUserId(): String? = tokenStore.userId()

    override suspend fun isLoggedIn(): Boolean = tokenStore.accessToken() != null
}
