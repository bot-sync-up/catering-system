package co.il.catering.data.remote

import co.il.catering.data.remote.dto.ShiftDto
import retrofit2.http.*

interface ShiftApi {
    @GET("shifts/my")
    suspend fun mine(@Query("from") fromIso: String? = null): List<ShiftDto>

    @POST("shifts/{id}/clock-in")
    suspend fun clockIn(@Path("id") id: String, @Body body: Map<String, Any>): ShiftDto

    @POST("shifts/{id}/clock-out")
    suspend fun clockOut(@Path("id") id: String, @Body body: Map<String, Any>): ShiftDto

    @POST("shifts/{id}/swap-request")
    suspend fun requestSwap(@Path("id") id: String, @Body body: Map<String, String>): Unit
}
