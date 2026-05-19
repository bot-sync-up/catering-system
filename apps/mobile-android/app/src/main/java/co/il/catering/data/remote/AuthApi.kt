package co.il.catering.data.remote

import com.squareup.moshi.JsonClass
import retrofit2.http.Body
import retrofit2.http.POST

@JsonClass(generateAdapter = true)
data class LoginRequest(val email: String, val password: String, val otp: String? = null)

@JsonClass(generateAdapter = true)
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val role: String,
    val userId: String,
)

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): TokenResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: Map<String, String>): TokenResponse

    @POST("auth/logout")
    suspend fun logout(): Unit

    @POST("auth/otp/request")
    suspend fun requestOtp(@Body body: Map<String, String>): Unit
}
