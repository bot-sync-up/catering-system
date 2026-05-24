package co.il.catering.core.sync

import co.il.catering.core.storage.entity.OfflineQueueEntity
import co.il.catering.data.local.OfflineQueueDao
import com.squareup.moshi.Moshi
import com.squareup.moshi.adapter
import javax.inject.Inject
import javax.inject.Singleton

/**
 * תור פעולות שממתינות לסנכרון. בכל פעולה שנכשלת ברשת,
 * אנו מוסיפים לתור כדי שה-Worker יסנכרן בעת חיבור.
 */
@Singleton
class OfflineQueueManager @Inject constructor(
    private val dao: OfflineQueueDao,
    private val moshi: Moshi,
) {
    @OptIn(ExperimentalStdlibApi::class)
    suspend fun <T> enqueue(type: String, payload: T) {
        val json = moshi.adapter<Any>().toJson(payload as Any)
        dao.enqueue(OfflineQueueEntity(type = type, payload = json))
    }

    suspend fun pendingCount(): Int = dao.count()
    suspend fun next(): List<OfflineQueueEntity> = dao.next()
    suspend fun ack(id: Long) = dao.delete(id)
    suspend fun fail(id: Long, error: String?) = dao.markFailed(id, error)
}
