package co.il.catering.core.storage.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val email: String,
    val displayName: String,
    val role: String,
    val phone: String? = null,
    val avatarUrl: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
)
