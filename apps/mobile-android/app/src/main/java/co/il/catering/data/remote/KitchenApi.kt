package co.il.catering.data.remote

import co.il.catering.data.remote.dto.PrepTaskDto
import retrofit2.http.*

interface KitchenApi {
    @GET("kitchen/prep-tasks")
    suspend fun listPrepTasks(@Query("date") dateIso: String? = null): List<PrepTaskDto>

    @POST("kitchen/prep-tasks/{id}/done")
    suspend fun markDone(@Path("id") id: String): PrepTaskDto

    @POST("kitchen/prep-tasks/{id}/note")
    suspend fun addNote(@Path("id") id: String, @Body body: Map<String, String>): Unit
}
