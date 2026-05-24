package co.il.catering.data.repository

import co.il.catering.core.sync.OfflineQueueManager
import co.il.catering.data.remote.ShiftApi
import co.il.catering.data.toDomain
import co.il.catering.domain.model.Shift
import co.il.catering.domain.repository.ShiftRepository
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShiftRepositoryImpl @Inject constructor(
    private val api: ShiftApi,
    private val queue: OfflineQueueManager,
) : ShiftRepository {

    override suspend fun mine(from: Instant?): Result<List<Shift>> = runCatching {
        api.mine(from?.toString()).map { it.toDomain() }
    }

    override suspend fun clockIn(shiftId: String, lat: Double?, lng: Double?): Result<Shift> = runCatching {
        val body = mapOf("lat" to (lat ?: 0.0), "lng" to (lng ?: 0.0), "ts" to Instant.now().toString())
        try {
            api.clockIn(shiftId, body).toDomain()
        } catch (e: Exception) {
            queue.enqueue("clockIn", mapOf("id" to shiftId) + body)
            throw e
        }
    }

    override suspend fun clockOut(shiftId: String, lat: Double?, lng: Double?): Result<Shift> = runCatching {
        val body = mapOf("lat" to (lat ?: 0.0), "lng" to (lng ?: 0.0), "ts" to Instant.now().toString())
        try {
            api.clockOut(shiftId, body).toDomain()
        } catch (e: Exception) {
            queue.enqueue("clockOut", mapOf("id" to shiftId) + body)
            throw e
        }
    }

    override suspend fun requestSwap(shiftId: String, reason: String): Result<Unit> = runCatching {
        api.requestSwap(shiftId, mapOf("reason" to reason))
    }
}
