package co.il.catering.core.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import co.il.catering.data.remote.*
import com.squareup.moshi.Moshi
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Worker שמסנכרן את התור עם השרת. רץ ברקע ב-WorkManager
 * בכל פעם שיש חיבור לרשת.
 */
@HiltWorker
class OfflineQueueWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val queue: OfflineQueueManager,
    private val ordersApi: OrdersApi,
    private val kitchenApi: KitchenApi,
    private val shiftApi: ShiftApi,
    private val moshi: Moshi,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val batch = queue.next()
        if (batch.isEmpty()) return Result.success()
        var anyFailed = false
        for (item in batch) {
            try {
                dispatch(item.type, item.payload)
                queue.ack(item.id)
            } catch (e: Exception) {
                queue.fail(item.id, e.message)
                anyFailed = true
                if (item.attempts >= 5) queue.ack(item.id) // drop after 5 failures
            }
        }
        return if (anyFailed) Result.retry() else Result.success()
    }

    private suspend fun dispatch(type: String, payload: String) {
        val json = JSONObject(payload)
        when (type) {
            "confirmOrder" -> ordersApi.confirm(json.getString("id"))
            "cancelOrder" -> ordersApi.cancel(json.getString("id"))
            "markTaskDone" -> kitchenApi.markDone(json.getString("id"))
            "clockIn" -> {
                val id = json.getString("id")
                shiftApi.clockIn(id, mapOf(
                    "lat" to json.optDouble("lat", 0.0),
                    "lng" to json.optDouble("lng", 0.0),
                    "ts" to json.optString("ts"),
                ))
            }
            "clockOut" -> {
                val id = json.getString("id")
                shiftApi.clockOut(id, mapOf(
                    "lat" to json.optDouble("lat", 0.0),
                    "lng" to json.optDouble("lng", 0.0),
                    "ts" to json.optString("ts"),
                ))
            }
            // הרחבה לפי סוגים נוספים
        }
    }

    companion object {
        const val UNIQUE_NAME = "OfflineQueueSync"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val periodic = PeriodicWorkRequestBuilder<OfflineQueueWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.KEEP, periodic)
        }

        fun trigger(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val req = OneTimeWorkRequestBuilder<OfflineQueueWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "${UNIQUE_NAME}_once",
                ExistingWorkPolicy.REPLACE,
                req,
            )
        }
    }
}
