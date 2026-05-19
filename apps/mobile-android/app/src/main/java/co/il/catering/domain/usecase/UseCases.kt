package co.il.catering.domain.usecase

import co.il.catering.data.remote.InvoiceOcrResult
import co.il.catering.domain.model.*
import co.il.catering.domain.repository.*
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/** קבלת הזמנות היום עבור לוח הבקרה. */
class GetTodayOrdersUseCase @Inject constructor(
    private val repo: OrdersRepository,
) {
    operator fun invoke(): Flow<List<Order>> = repo.observeToday()
    suspend fun refresh() = repo.refresh()
}

/** החתמת כניסה - כולל מיקום GPS. */
class ClockInUseCase @Inject constructor(
    private val repo: ShiftRepository,
) {
    suspend operator fun invoke(shiftId: String, lat: Double?, lng: Double?): Result<Shift> =
        repo.clockIn(shiftId, lat, lng)
}

class ClockOutUseCase @Inject constructor(
    private val repo: ShiftRepository,
) {
    suspend operator fun invoke(shiftId: String, lat: Double?, lng: Double?): Result<Shift> =
        repo.clockOut(shiftId, lat, lng)
}

/** סימון משימה כהושלמה. */
class MarkTaskDoneUseCase @Inject constructor(
    private val repo: TaskRepository,
) {
    suspend operator fun invoke(taskId: String): Result<Unit> = repo.markDone(taskId)
}

/** העלאת תמונת תיעוד מסירה. */
class UploadDeliveryProofUseCase @Inject constructor(
    private val repo: DeliveryRepository,
) {
    suspend operator fun invoke(deliveryId: String, photoPath: String): Result<String> =
        repo.uploadProof(deliveryId, photoPath)
}

/** סריקת חשבונית - מעלה תמונה לשרת ומקבל ניתוח OCR + Claude Vision. */
class ScanInvoiceOcrUseCase @Inject constructor(
    private val repo: OcrRepository,
) {
    suspend operator fun invoke(localPath: String): Result<InvoiceOcrResult> = repo.scanInvoice(localPath)
}

/** לכידת חתימה - שומר בקובץ ומעלה לשרת. */
class CaptureSignatureUseCase @Inject constructor(
    private val repo: DeliveryRepository,
) {
    suspend operator fun invoke(deliveryId: String, signaturePath: String): Result<String> =
        repo.uploadSignature(deliveryId, signaturePath)
}

/** הזמנת היום של נהג */
class GetMyDeliveriesUseCase @Inject constructor(
    private val repo: DeliveryRepository,
) {
    suspend operator fun invoke(): Result<List<Delivery>> = repo.today()
}

/** משימות מטבח */
class GetPrepTasksUseCase @Inject constructor(
    private val repo: KitchenRepository,
) {
    suspend operator fun invoke(): Result<List<PrepTask>> = repo.prepTasks()
}

class MarkPrepDoneUseCase @Inject constructor(
    private val repo: KitchenRepository,
) {
    suspend operator fun invoke(id: String): Result<Unit> = repo.markPrepDone(id)
}

/** Login / Logout */
class LoginUseCase @Inject constructor(
    private val repo: AuthRepository,
) {
    suspend operator fun invoke(email: String, password: String, otp: String? = null) =
        repo.login(email, password, otp)
}

class LogoutUseCase @Inject constructor(
    private val repo: AuthRepository,
) { suspend operator fun invoke() = repo.logout() }

/** CRM - חיפוש לידים */
class GetLeadsUseCase @Inject constructor(
    private val repo: CrmRepository,
) {
    suspend operator fun invoke(stage: LeadStage? = null): Result<List<Lead>> = repo.leads(stage)
}

class SaveLeadUseCase @Inject constructor(
    private val repo: CrmRepository,
) {
    suspend operator fun invoke(lead: Lead): Result<Lead> = repo.saveLead(lead)
}
