package co.il.catering.core.storage

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import co.il.catering.core.storage.entity.CachedOrderEntity
import co.il.catering.core.storage.entity.CachedTaskEntity
import co.il.catering.core.storage.entity.OfflineQueueEntity
import co.il.catering.core.storage.entity.PhotoEntity
import co.il.catering.core.storage.entity.UserEntity
import co.il.catering.data.local.OfflineQueueDao
import co.il.catering.data.local.OrderDao
import co.il.catering.data.local.PhotoDao
import co.il.catering.data.local.TaskDao
import co.il.catering.data.local.UserDao

@Database(
    entities = [
        UserEntity::class,
        CachedOrderEntity::class,
        CachedTaskEntity::class,
        OfflineQueueEntity::class,
        PhotoEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class CateringDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun orderDao(): OrderDao
    abstract fun taskDao(): TaskDao
    abstract fun queueDao(): OfflineQueueDao
    abstract fun photoDao(): PhotoDao

    companion object { const val NAME = "catering.db" }
}
