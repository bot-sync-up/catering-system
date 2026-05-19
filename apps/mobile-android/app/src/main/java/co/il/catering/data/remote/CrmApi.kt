package co.il.catering.data.remote

import co.il.catering.data.remote.dto.CustomerDto
import co.il.catering.data.remote.dto.LeadDto
import retrofit2.http.*

interface CrmApi {
    @GET("crm/customers")
    suspend fun listCustomers(@Query("q") query: String? = null): List<CustomerDto>

    @GET("crm/customers/{id}")
    suspend fun getCustomer(@Path("id") id: String): CustomerDto

    @POST("crm/customers")
    suspend fun createCustomer(@Body body: CustomerDto): CustomerDto

    @GET("crm/leads")
    suspend fun listLeads(@Query("stage") stage: String? = null): List<LeadDto>

    @GET("crm/leads/{id}")
    suspend fun getLead(@Path("id") id: String): LeadDto

    @POST("crm/leads")
    suspend fun createLead(@Body body: LeadDto): LeadDto

    @PUT("crm/leads/{id}")
    suspend fun updateLead(@Path("id") id: String, @Body body: LeadDto): LeadDto
}
