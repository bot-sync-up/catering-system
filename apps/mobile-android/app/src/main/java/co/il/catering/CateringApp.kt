package co.il.catering

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import co.il.catering.core.notifications.NotificationChannels
import co.il.catering.core.sync.OfflineQueueWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application הראשי - מנהל את חיי האפליקציה, אתחול ערוצי התראות
 * וקונפיגורציה של WorkManager עם Hilt.
 */
@HiltAndroidApp
class CateringApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var notificationChannels: NotificationChannels

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        notificationChannels.createAll()
        OfflineQueueWorker.schedule(this)
    }
}
