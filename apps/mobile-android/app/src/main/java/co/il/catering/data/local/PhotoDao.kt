package co.il.catering.data.local

import androidx.room.*
import co.il.catering.core.storage.entity.PhotoEntity

@Dao
interface PhotoDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: PhotoEntity)

    @Query("SELECT * FROM photos WHERE uploaded = 0")
    suspend fun pending(): List<PhotoEntity>

    @Query("SELECT * FROM photos WHERE orderId = :orderId")
    suspend fun forOrder(orderId: String): List<PhotoEntity>

    @Query("UPDATE photos SET uploaded = 1, remoteUrl = :url WHERE localId = :id")
    suspend fun markUploaded(id: String, url: String)

    @Query("DELETE FROM photos WHERE localId = :id")
    suspend fun delete(id: String)
}
