package co.il.catering.data.remote

import com.squareup.moshi.JsonClass
import okhttp3.MultipartBody
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

/**
 * שרת מקבל תמונה ומחזיר OCR + ניתוח Claude Vision של החשבונית.
 */
@JsonClass(generateAdapter = true)
data class InvoiceOcrResult(
    val supplierName: String?,
    val invoiceNumber: String?,
    val totalAmount: Double?,
    val date: String?,
    val rawText: String,
    val items: List<InvoiceItem> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class InvoiceItem(
    val name: String,
    val quantity: Double?,
    val unitPrice: Double?,
    val totalPrice: Double?,
)

interface OcrApi {
    @Multipart
    @POST("ocr/invoice")
    suspend fun scanInvoice(@Part image: MultipartBody.Part): InvoiceOcrResult
}
