package co.il.catering.data.local

import androidx.room.*
import co.il.catering.core.storage.entity.CachedTaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM cached_tasks WHERE role = :role AND status != 'done' ORDER BY dueAt ASC")
    fun observeOpenByRole(role: String): Flow<List<CachedTaskEntity>>

    @Query("SELECT * FROM cached_tasks WHERE assigneeId = :userId ORDER BY dueAt ASC")
    fun observeAssigned(userId: String): Flow<List<CachedTaskEntity>>

    @Query("SELECT * FROM cached_tasks WHERE id = :id")
    suspend fun byId(id: String): CachedTaskEntity?

    @Query("SELECT * FROM cached_tasks WHERE dirty = 1")
    suspend fun dirty(): List<CachedTaskEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CachedTaskEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: CachedTaskEntity)

    @Query("DELETE FROM cached_tasks")
    suspend fun clear()
}
