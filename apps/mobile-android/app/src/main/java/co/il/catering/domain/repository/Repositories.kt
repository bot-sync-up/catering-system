package co.il.catering.domain.repository

import co.il.catering.domain.model.*
import kotlinx.coroutines.flow.Flow
import java.time.Instant

interface AuthRepository {
    suspend fun login(email: String, password: String, otp: String? = null): Result<User>
    suspend fun logout()
    suspend fun currentRole(): UserRole?
    suspend fun currentUserId(): String?
    suspend fun isLoggedIn(): Boolean
}

interface OrdersRepository {
    fun observeToday(): Flow<List<Order>>
    fun observeRange(from: Instant, to: Instant): Flow<List<Order>>
    fun observe(id: String): Flow<Order?>
    suspend fun refresh()
    suspend fun create(order: Order): Result<Order>
    suspend fun confirm(id: String): Result<Order>
    suspend fun cancel(id: String): Result<Order>
}

interface TaskRepository {
    fun observeOpen(role: UserRole): Flow<List<Task>>
    fun observeAssigned(userId: String): Flow<List<Task>>
    suspend fun refresh()
    suspend fun markDone(taskId: String): Result<Unit>
}

interface CrmRepository {
    suspend fun searchCustomers(query: String?): Result<List<Customer>>
    suspend fun customer(id: String): Result<Customer>
    suspend fun leads(stage: LeadStage? = null): Result<List<Lead>>
    suspend fun lead(id: String): Result<Lead>
    suspend fun saveLead(lead: Lead): Result<Lead>
}

interface KitchenRepository {
    suspend fun prepTasks(date: Instant? = null): Result<List<PrepTask>>
    suspend fun markPrepDone(id: String): Result<Unit>
}

interface DeliveryRepository {
    suspend fun today(): Result<List<Delivery>>
    suspend fun start(id: String): Result<Delivery>
    suspend fun arrive(id: String): Result<Delivery>
    suspend fun deliver(id: String, notes: String?): Result<Delivery>
    suspend fun uploadProof(deliveryId: String, photoPath: String): Result<String>
    suspend fun uploadSignature(deliveryId: String, signaturePath: String): Result<String>
}

interface ShiftRepository {
    suspend fun mine(from: Instant? = null): Result<List<Shift>>
    suspend fun clockIn(shiftId: String, lat: Double?, lng: Double?): Result<Shift>
    suspend fun clockOut(shiftId: String, lat: Double?, lng: Double?): Result<Shift>
    suspend fun requestSwap(shiftId: String, reason: String): Result<Unit>
}

interface OcrRepository {
    suspend fun scanInvoice(localPath: String): Result<co.il.catering.data.remote.InvoiceOcrResult>
}
