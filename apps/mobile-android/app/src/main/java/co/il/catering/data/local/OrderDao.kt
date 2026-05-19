package co.il.catering.data.local

import androidx.room.*
import co.il.catering.core.storage.entity.CachedOrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("SELECT * FROM cached_orders ORDER BY eventDate ASC")
    fun observeAll(): Flow<List<CachedOrderEntity>>

    @Query("SELECT * FROM cached_orders WHERE eventDate BETWEEN :start AND :end ORDER BY eventDate ASC")
    fun observeBetween(start: Long, end: Long): Flow<List<CachedOrderEntity>>

    @Query("SELECT * FROM cached_orders WHERE id = :id")
    fun observe(id: String): Flow<CachedOrderEntity?>

    @Query("SELECT * FROM cached_orders WHERE dirty = 1")
    suspend fun dirty(): List<CachedOrderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CachedOrderEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: CachedOrderEntity)

    @Query("DELETE FROM cached_orders WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM cached_orders")
    suspend fun clear()
}
