package co.il.catering.core.notifications

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import co.il.catering.R
import co.il.catering.core.dnd.DndGate
import co.il.catering.presentation.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * שירות FCM. מזהה את הקטגוריה לפי data['category'] ושולח לערוץ הנכון.
 * כיבוד DND quiet hours.
 */
@AndroidEntryPoint
class CateringFcmService : FirebaseMessagingService() {

    @Inject lateinit var dndGate: DndGate

    override fun onNewToken(token: String) {
        // TODO: register token with backend
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val category = message.data["category"] ?: NotificationChannels.ORDERS
        if (dndGate.isQuietNow() && category != NotificationChannels.GEOFENCE) return

        val title = message.notification?.title ?: message.data["title"].orEmpty()
        val body = message.notification?.body ?: message.data["body"].orEmpty()
        showNotification(category, title, body, message.data["deepLink"])
    }

    private fun showNotification(channel: String, title: String, body: String, deepLink: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            deepLink?.let { putExtra("deepLink", it) }
        }
        val pi = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(System.currentTimeMillis().toInt(), notification)
    }
}
