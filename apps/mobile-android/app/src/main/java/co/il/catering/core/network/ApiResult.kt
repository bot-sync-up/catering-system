package co.il.catering.core.network

/** עטיפה בטוחה לתוצאת קריאת רשת. */
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Error(val code: Int? = null, val message: String) : ApiResult<Nothing>
    data object NetworkError : ApiResult<Nothing>
}

inline fun <T> apiCall(block: () -> T): ApiResult<T> = try {
    ApiResult.Success(block())
} catch (e: retrofit2.HttpException) {
    ApiResult.Error(e.code(), e.message())
} catch (e: java.io.IOException) {
    ApiResult.NetworkError
} catch (e: Throwable) {
    ApiResult.Error(message = e.message ?: "Unknown error")
}
