package co.il.catering.core.camera

import android.content.Context
import android.net.Uri
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.LifecycleOwner
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * עוטף את CameraX. שומר תמונות לתיקיית cache.
 * שימוש: bind ב-Composable -> capture -> מקבל Uri+File.
 */
@Singleton
class CameraXManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    data class Capture(val uri: Uri, val file: File)

    private var imageCapture: ImageCapture? = null

    suspend fun bind(
        lifecycleOwner: LifecycleOwner,
        previewProvider: (Preview) -> Unit,
    ) {
        val cameraProvider = ProcessCameraProvider.getInstance(context).get()
        val preview = Preview.Builder().build().also(previewProvider)
        val capture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
        this.imageCapture = capture
        cameraProvider.unbindAll()
        cameraProvider.bindToLifecycle(
            lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, capture
        )
    }

    suspend fun capture(): Capture = suspendCancellableCoroutine { cont ->
        val capture = imageCapture ?: run {
            cont.resumeWithException(IllegalStateException("Camera not bound"))
            return@suspendCancellableCoroutine
        }
        val folder = File(context.cacheDir, "camera").apply { mkdirs() }
        val name = "IMG_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date()) + ".jpg"
        val file = File(folder, name)
        val options = ImageCapture.OutputFileOptions.Builder(file).build()
        capture.takePicture(
            options,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val uri = FileProvider.getUriForFile(
                        context, "${context.packageName}.fileprovider", file
                    )
                    if (cont.isActive) cont.resume(Capture(uri, file))
                }
                override fun onError(exception: ImageCaptureException) {
                    if (cont.isActive) cont.resumeWithException(exception)
                }
            }
        )
    }
}
