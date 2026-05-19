package co.il.catering.data.remote

import co.il.catering.data.remote.dto.DeliveryDto
import okhttp3.MultipartBody
import retrofit2.http.*

interface DeliveryApi {
    @GET("delivery/today")
    suspend fun today(): List<DeliveryDto>

    @POST("delivery/{id}/start")
    suspend fun start(@Path("id") id: String): DeliveryDto

    @POST("delivery/{id}/arrive")
    suspend fun arrive(@Path("id") id: String): DeliveryDto

    @POST("delivery/{id}/delivered")
    suspend fun delivered(@Path("id") id: String, @Body body: Map<String, String>): DeliveryDto

    @Multipart
    @POST("delivery/{id}/proof")
    suspend fun uploadProof(
        @Path("id") id: String,
        @Part photo: MultipartBody.Part,
    ): Map<String, String>

    @Multipart
    @POST("delivery/{id}/signature")
    suspend fun uploadSignature(
        @Path("id") id: String,
        @Part signature: MultipartBody.Part,
    ): Map<String, String>
}
