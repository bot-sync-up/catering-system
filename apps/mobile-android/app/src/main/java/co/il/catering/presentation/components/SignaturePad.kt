package co.il.catering.presentation.components

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path as ComposePath
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import java.io.File
import java.io.FileOutputStream
import androidx.compose.ui.graphics.Color as ComposeColor

/**
 * Pad לחתימה. אוסף stroke-ים, ובלחיצה על "שמור" יוצר קובץ PNG.
 */
@Composable
fun SignaturePad(
    modifier: Modifier = Modifier,
    onSaved: (File) -> Unit,
) {
    val ctx = LocalContext.current
    val strokes = remember { mutableStateListOf<List<Offset>>() }
    var currentStroke by remember { mutableStateOf<List<Offset>>(emptyList()) }
    var canvasSize by remember { mutableStateOf(androidx.compose.ui.geometry.Size.Zero) }

    Column(modifier) {
        Canvas(
            modifier = Modifier.fillMaxWidth().weight(1f)
                .background(ComposeColor.White)
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { offset -> currentStroke = listOf(offset) },
                        onDragEnd = {
                            if (currentStroke.isNotEmpty()) strokes.add(currentStroke)
                            currentStroke = emptyList()
                        },
                        onDrag = { change, _ ->
                            change.consume()
                            currentStroke = currentStroke + change.position
                        },
                    )
                },
        ) {
            canvasSize = size
            (strokes + listOf(currentStroke)).forEach { stroke ->
                if (stroke.size < 2) return@forEach
                val path = ComposePath()
                path.moveTo(stroke.first().x, stroke.first().y)
                stroke.drop(1).forEach { path.lineTo(it.x, it.y) }
                drawPath(
                    path = path,
                    color = ComposeColor.Black,
                    style = Stroke(width = 4f, cap = StrokeCap.Round),
                )
            }
        }
        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { strokes.clear() }) { Text("נקה") }
            Button(onClick = {
                val w = canvasSize.width.toInt().coerceAtLeast(800)
                val h = canvasSize.height.toInt().coerceAtLeast(400)
                val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                canvas.drawColor(Color.WHITE)
                val paint = Paint().apply {
                    color = Color.BLACK
                    strokeWidth = 4f
                    style = Paint.Style.STROKE
                    strokeCap = Paint.Cap.ROUND
                    isAntiAlias = true
                }
                strokes.forEach { stroke ->
                    val path = Path()
                    if (stroke.size < 2) return@forEach
                    path.moveTo(stroke.first().x, stroke.first().y)
                    stroke.drop(1).forEach { path.lineTo(it.x, it.y) }
                    canvas.drawPath(path, paint)
                }
                val folder = File(ctx.filesDir, "signatures").apply { mkdirs() }
                val file = File(folder, "sig_${System.currentTimeMillis()}.png")
                FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
                onSaved(file)
            }) { Text("שמור חתימה") }
        }
    }
}
