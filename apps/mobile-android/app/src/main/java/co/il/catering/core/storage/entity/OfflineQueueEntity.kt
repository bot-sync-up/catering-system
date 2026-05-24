package co.il.catering.core.storage.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * תור פעולות שממתינות לסנכרון לשרת.
 * type = שם הפעולה (createOrder/markTaskDone/clockIn/...).
 * payload = JSON.
 */
@Entity(tableName = "offline_queue")
data class OfflineQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String,
    val payload: String,
    val createdAt: Long = System.currentTimeMillis(),
    val attempts: Int = 0,
    val lastError: String? = null,
)
