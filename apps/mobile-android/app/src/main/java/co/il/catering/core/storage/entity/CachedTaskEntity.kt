package co.il.catering.core.storage.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_tasks")
data class CachedTaskEntity(
    @PrimaryKey val id: String,
    val orderId: String?,
    val title: String,
    val description: String?,
    val assigneeId: String?,
    val role: String,
    val dueAt: Long?,
    val status: String, // pending / in_progress / done
    val updatedAt: Long = System.currentTimeMillis(),
    val dirty: Boolean = false,
)
