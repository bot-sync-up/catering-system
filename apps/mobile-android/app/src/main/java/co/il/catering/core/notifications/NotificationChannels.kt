package co.il.catering.core.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ערוצי התראות לפי תפקיד/קטגוריה.
 * מוגדר פעם אחת ב-Application#onCreate.
 */
@Singleton
class NotificationChannels @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun createAll() {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        listOf(
            NotificationChannel(ORDERS, "הזמנות", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "התראות על הזמנות חדשות וסטטוס"
            },
            NotificationChannel(PAYMENTS, "תשלומים", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "התראות על תשלומים שהתקבלו או ממתינים"
            },
            NotificationChannel(SHIFTS, "משמרות", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "תזכורות לכניסה/יציאה ולוח משמרות"
            },
            NotificationChannel(TASKS, "משימות", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "משימות חדשות, הקצאה ועדכוני סטטוס"
            },
            NotificationChannel(GEOFENCE, "איזורי גידור", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "הגעה לאתר אירוע / יציאה מאזור גידור"
            },
        ).forEach { nm.createNotificationChannel(it) }
    }

    companion object {
        const val ORDERS = "orders"
        const val PAYMENTS = "payments"
        const val SHIFTS = "shifts"
        const val TASKS = "tasks"
        const val GEOFENCE = "geofence"
    }
}
