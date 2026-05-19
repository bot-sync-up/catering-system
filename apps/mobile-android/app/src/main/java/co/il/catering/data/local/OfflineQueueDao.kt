package co.il.catering.data.local

import androidx.room.*
import co.il.catering.core.storage.entity.OfflineQueueEntity

@Dao
interface OfflineQueueDao {
    @Insert suspend fun enqueue(item: OfflineQueueEntity): Long

    @Query("SELECT * FROM offline_queue ORDER BY createdAt ASC LIMIT 50")
    suspend fun next(): List<OfflineQueueEntity>

    @Query("UPDATE offline_queue SET attempts = attempts + 1, lastError = :error WHERE id = :id")
    suspend fun markFailed(id: Long, error: String?)

    @Query("DELETE FROM offline_queue WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("SELECT COUNT(*) FROM offline_queue")
    suspend fun count(): Int
}
