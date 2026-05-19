package co.il.catering.data.repository

import co.il.catering.core.sync.OfflineQueueManager
import co.il.catering.data.local.OrderDao
import co.il.catering.data.remote.OrdersApi
import co.il.catering.data.remote.dto.OrderDto
import co.il.catering.data.toDomain
import co.il.catering.data.toEntity
import co.il.catering.domain.model.Order
import co.il.catering.domain.repository.OrdersRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrdersRepositoryImpl @Inject constructor(
    private val api: OrdersApi,
    private val dao: OrderDao,
    private val queue: OfflineQueueManager,
) : OrdersRepository {

    override fun observeToday(): Flow<List<Order>> {
        val today = LocalDate.now(ZoneId.systemDefault())
        val start = today.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val end = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        return dao.observeBetween(start, end).map { list -> list.map { it.toDomain() } }
    }

    override fun observeRange(from: Instant, to: Instant): Flow<List<Order>> =
        dao.observeBetween(from.toEpochMilli(), to.toEpochMilli()).map { list -> list.map { it.toDomain() } }

    override fun observe(id: String): Flow<Order?> =
        dao.observe(id).map { it?.toDomain() }

    override suspend fun refresh() {
        runCatching {
            val remote = api.list()
            dao.upsertAll(remote.map { it.toDomain().toEntity() })
        }
    }

    override suspend fun create(order: Order): Result<Order> = runCatching {
        dao.upsert(order.toEntity(dirty = true))
        try {
            val saved = api.create(toDto(order)).toDomain()
            dao.upsert(saved.toEntity(dirty = false))
            saved
        } catch (e: Exception) {
            queue.enqueue("createOrder", order)
            order
        }
    }

    override suspend fun confirm(id: String): Result<Order> = runCatching {
        try {
            api.confirm(id).toDomain().also { dao.upsert(it.toEntity()) }
        } catch (e: Exception) {
            queue.enqueue("confirmOrder", mapOf("id" to id))
            throw e
        }
    }

    override suspend fun cancel(id: String): Result<Order> = runCatching {
        try {
            api.cancel(id).toDomain().also { dao.upsert(it.toEntity()) }
        } catch (e: Exception) {
            queue.enqueue("cancelOrder", mapOf("id" to id))
            throw e
        }
    }

    private fun toDto(o: Order) = OrderDto(
        id = o.id, customerId = o.customerId, customerName = o.customerName,
        eventDate = o.eventDate.toString(), status = o.status.name,
        totalAmount = o.totalAmount, paidAmount = o.paidAmount,
        address = o.address, notes = o.notes,
    )
}
