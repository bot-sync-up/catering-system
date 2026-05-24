package co.il.catering.data.remote.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class OrderDto(
    val id: String,
    val customerId: String,
    val customerName: String,
    val eventDate: String, // ISO 8601
    val status: String,
    val totalAmount: Double,
    val paidAmount: Double,
    val address: String? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class CustomerDto(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val notes: String? = null,
    val tags: List<String> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class LeadDto(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val source: String? = null,
    val stage: String,
    val estimatedValue: Double? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class PrepTaskDto(
    val id: String,
    val orderId: String,
    val item: String,
    val quantity: Double,
    val unit: String,
    val status: String,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class DeliveryDto(
    val id: String,
    val orderId: String,
    val driverId: String? = null,
    val address: String,
    val lat: Double? = null,
    val lng: Double? = null,
    val status: String,
    val signatureUrl: String? = null,
    val proofPhotoUrl: String? = null,
    val deliveredAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class ShiftDto(
    val id: String,
    val userId: String,
    val role: String,
    val startsAt: String,
    val endsAt: String,
    val clockInAt: String? = null,
    val clockOutAt: String? = null,
    val location: String? = null,
)
