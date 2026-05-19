package co.il.catering.di

import android.content.Context
import androidx.room.Room
import co.il.catering.core.storage.CateringDatabase
import co.il.catering.data.local.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): CateringDatabase =
        Room.databaseBuilder(ctx, CateringDatabase::class.java, CateringDatabase.NAME)
            .fallbackToDestructiveMigration() // dev only; להחליף ב-migrations production
            .build()

    @Provides fun userDao(db: CateringDatabase): UserDao = db.userDao()
    @Provides fun orderDao(db: CateringDatabase): OrderDao = db.orderDao()
    @Provides fun taskDao(db: CateringDatabase): TaskDao = db.taskDao()
    @Provides fun queueDao(db: CateringDatabase): OfflineQueueDao = db.queueDao()
    @Provides fun photoDao(db: CateringDatabase): PhotoDao = db.photoDao()
}
