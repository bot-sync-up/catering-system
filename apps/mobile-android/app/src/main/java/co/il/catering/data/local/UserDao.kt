package co.il.catering.data.local

import androidx.room.*
import co.il.catering.core.storage.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id") suspend fun byId(id: String): UserEntity?
    @Query("SELECT * FROM users WHERE id = :id") fun observe(id: String): Flow<UserEntity?>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsert(user: UserEntity)
    @Query("DELETE FROM users") suspend fun clear()
}
