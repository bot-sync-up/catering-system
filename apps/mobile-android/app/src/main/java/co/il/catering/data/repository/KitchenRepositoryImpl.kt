package co.il.catering.data.repository

import co.il.catering.data.remote.KitchenApi
import co.il.catering.data.toDomain
import co.il.catering.domain.model.PrepTask
import co.il.catering.domain.repository.KitchenRepository
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KitchenRepositoryImpl @Inject constructor(
    private val api: KitchenApi,
) : KitchenRepository {

    override suspend fun prepTasks(date: Instant?): Result<List<PrepTask>> = runCatching {
        api.listPrepTasks(date?.toString()).map { it.toDomain() }
    }

    override suspend fun markPrepDone(id: String): Result<Unit> = runCatching {
        api.markDone(id)
        Unit
    }
}
