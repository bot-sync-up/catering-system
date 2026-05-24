package co.il.catering.domain.model

import java.time.Instant

/**
 * מודלים של תחום העסקי. מופרדים לחלוטין משכבת ה-DB וה-API.
 */

enum class UserRole { MANAGER, AGENT, KITCHEN, SHIFT, DRIVER, CUSTOMER }

data class User(
    val id: String,
    val email: String,
    val displayName: String,
    val role: UserRole,
    val phone: String? = null,
    val avatarUrl: String? = null,
)

data class Customer(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val address: String?,
    val notes: String?,
    val tags: List<String> = emptyList(),
)

enum class OrderStatus { PENDING, CONFIRMED, IN_PREP, ON_ROUTE, DELIVERED, CANCELLED }

data class Order(
    val id: String,
    val customerId: String,
    val customerName: String,
    val eventDate: Instant,
    val status: OrderStatus,
    val totalAmount: Double,
    val paidAmount: Double,
    val address: String?,
    val notes: String?,
)

data class Event(
    val id: String,
    val orderId: String,
    val name: String,
    val location: String,
    val startsAt: Instant,
    val endsAt: Instant,
    val expectedGuests: Int,
)

enum class TaskStatus { PENDING, IN_PROGRESS, DONE }

data class Task(
    val id: String,
    val orderId: String?,
    val title: String,
    val description: String?,
    val assigneeId: String?,
    val role: UserRole,
    val dueAt: Instant?,
    val status: TaskStatus,
)

data class PrepTask(
    val id: String,
    val orderId: String,
    val item: String,
    val quantity: Double,
    val unit: String,
    val status: TaskStatus,
    val notes: String?,
)

enum class DeliveryStatus { PENDING, ON_ROUTE, ARRIVED, DELIVERED, FAILED }

data class Delivery(
    val id: String,
    val orderId: String,
    val driverId: String?,
    val address: String,
    val lat: Double?,
    val lng: Double?,
    val status: DeliveryStatus,
    val signatureUrl: String? = null,
    val proofPhotoUrl: String? = null,
    val deliveredAt: Instant? = null,
)

enum class LeadStage { NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST }

data class Lead(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val source: String?,
    val stage: LeadStage,
    val estimatedValue: Double?,
    val notes: String?,
)

data class Shift(
    val id: String,
    val userId: String,
    val role: UserRole,
    val startsAt: Instant,
    val endsAt: Instant,
    val clockInAt: Instant? = null,
    val clockOutAt: Instant? = null,
    val location: String?,
)
