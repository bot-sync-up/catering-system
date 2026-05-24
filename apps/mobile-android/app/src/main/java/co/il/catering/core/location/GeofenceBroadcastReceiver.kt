package co.il.catering.core.location

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import co.il.catering.R
import co.il.catering.core.notifications.NotificationChannels
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class GeofenceBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return
        val transition = event.geofenceTransition
        val title = when (transition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "הגעת לאתר האירוע"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "יצאת מאזור האירוע"
            else -> return
        }
        val body = event.triggeringGeofences?.joinToString { it.requestId }.orEmpty()

        val notif = NotificationCompat.Builder(context, NotificationChannels.GEOFENCE)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build()
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(System.currentTimeMillis().toInt(), notif)
    }
}
