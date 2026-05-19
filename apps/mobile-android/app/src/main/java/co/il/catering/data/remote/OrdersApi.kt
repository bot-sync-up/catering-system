package co.il.catering.data.remote

import co.il.catering.data.remote.dto.OrderDto
import retrofit2.http.*

interface OrdersApi {
    @GET("orders")
    suspend fun list(
        @Query("from") fromIso: String? = null,
        @Query("to") toIso: String? = null,
        @Query("status") status: String? = null,
    ): List<OrderDto>

    @GET("orders/{id}")
    suspend fun get(@Path("id") id: String): OrderDto

    @POST("orders")
    suspend fun create(@Body body: OrderDto): OrderDto

    @PUT("orders/{id}")
    suspend fun update(@Path("id") id: String, @Body body: OrderDto): OrderDto

    @POST("orders/{id}/confirm")
    suspend fun confirm(@Path("id") id: String): OrderDto

    @POST("orders/{id}/cancel")
    suspend fun cancel(@Path("id") id: String): OrderDto
}
