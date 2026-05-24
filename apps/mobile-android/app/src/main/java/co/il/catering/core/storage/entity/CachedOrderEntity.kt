package co.il.catering.core.storage.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_orders")
data class CachedOrderEntity(
    @PrimaryKey val id: String,
    val customerId: String,
    val customerName: String,
    val eventDate: Long,
    val status: String,
    val totalAmount: Double,
    val paidAmount: Double,
    val address: String?,
    val notes: String?,
    val updatedAt: Long = System.currentTimeMillis(),
    val dirty: Boolean = false, // ממתין לסנכרון
)
