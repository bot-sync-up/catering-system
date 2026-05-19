package co.il.catering.core.storage.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "photos")
data class PhotoEntity(
    @PrimaryKey val localId: String,
    val orderId: String?,
    val taskId: String?,
    val localPath: String,
    val remoteUrl: String?,
    val kind: String, // delivery_proof / signature / invoice / general
    val createdAt: Long = System.currentTimeMillis(),
    val uploaded: Boolean = false,
)
