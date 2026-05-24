package co.il.catering.data.repository

import co.il.catering.data.remote.InvoiceOcrResult
import co.il.catering.data.remote.OcrApi
import co.il.catering.domain.repository.OcrRepository
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OcrRepositoryImpl @Inject constructor(
    private val api: OcrApi,
) : OcrRepository {

    override suspend fun scanInvoice(localPath: String): Result<InvoiceOcrResult> = runCatching {
        val file = File(localPath)
        val body = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("image", file.name, body)
        api.scanInvoice(part)
    }
}
