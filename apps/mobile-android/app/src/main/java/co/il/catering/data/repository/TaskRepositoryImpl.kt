package co.il.catering.data.repository

import co.il.catering.core.sync.OfflineQueueManager
import co.il.catering.data.local.TaskDao
import co.il.catering.data.remote.KitchenApi
import co.il.catering.data.toDomain
import co.il.catering.domain.model.Task
import co.il.catering.domain.model.TaskStatus
import co.il.catering.domain.model.UserRole
import co.il.catering.domain.repository.TaskRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepositoryImpl @Inject constructor(
    private val dao: TaskDao,
    private val kitchenApi: KitchenApi,
    private val queue: OfflineQueueManager,
) : TaskRepository {

    override fun observeOpen(role: UserRole): Flow<List<Task>> =
        dao.observeOpenByRole(role.name).map { list -> list.map { it.toDomain() } }

    override fun observeAssigned(userId: String): Flow<List<Task>> =
        dao.observeAssigned(userId).map { list -> list.map { it.toDomain() } }

    override suspend fun refresh() {
        // refresh implementation per role / endpoint
    }

    override suspend fun markDone(taskId: String): Result<Unit> = runCatching {
        // עדכון מקומי מיידי (אופטימי)
        dao.byId(taskId)?.let { entity ->
            dao.upsert(entity.copy(status = TaskStatus.DONE.name, dirty = true))
        }
        try {
            kitchenApi.markDone(taskId)
            dao.byId(taskId)?.let { dao.upsert(it.copy(dirty = false)) }
        } catch (e: Exception) {
            queue.enqueue("markTaskDone", mapOf("id" to taskId))
        }
    }
}
