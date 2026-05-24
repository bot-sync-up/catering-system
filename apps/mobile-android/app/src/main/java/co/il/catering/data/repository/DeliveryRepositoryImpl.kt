package co.il.catering.data.repository

import co.il.catering.data.remote.DeliveryApi
import co.il.catering.data.toDomain
import co.il.catering.domain.model.Delivery
import co.il.catering.domain.repository.DeliveryRepository
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeliveryRepositoryImpl @Inject constructor(
    private val api: DeliveryApi,
) : DeliveryRepository {

    override suspend fun today(): Result<List<Delivery>> = runCatching {
        api.today().map { it.toDomain() }
    }

    override suspend fun start(id: String): Result<Delivery> = runCatching {
        api.start(id).toDomain()
    }

    override suspend fun arrive(id: String): Result<Delivery> = runCatching {
        api.arrive(id).toDomain()
    }

    override suspend fun deliver(id: String, notes: String?): Result<Delivery> = runCatching {
        api.delivered(id, mapOf("notes" to (notes ?: ""))).toDomain()
    }

    override suspend fun uploadProof(deliveryId: String, photoPath: String): Result<String> = runCatching {
        val file = File(photoPath)
        val body = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("photo", file.name, body)
        api.uploadProof(deliveryId, part)["url"] ?: ""
    }

    override suspend fun uploadSignature(deliveryId: String, signaturePath: String): Result<String> = runCatching {
        val file = File(signaturePath)
        val body = file.asRequestBody("image/png".toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("signature", file.name, body)
        api.uploadSignature(deliveryId, part)["url"] ?: ""
    }
}
