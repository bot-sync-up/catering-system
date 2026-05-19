package co.il.catering.core.sync

import co.il.catering.core.storage.entity.CachedOrderEntity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * פתרון קונפליקטים בסנכרון.
 * אסטרטגיה: last-write-wins על בסיס updatedAt + סימון flag להתערבות ידנית
 * במקרה שגרסת השרת ישנה משמעותית מהגרסה המקומית הלא-מסונכרנת.
 */
@Singleton
class ConflictResolver @Inject constructor() {

    data class Resolution<T>(val winner: T, val needsManualReview: Boolean)

    fun resolveOrder(local: CachedOrderEntity, remote: CachedOrderEntity): Resolution<CachedOrderEntity> {
        // אם המקומי מלוכלך (יש שינויים שלא סונכרנו) - שמור אותו ובקש סקירה ידנית
        if (local.dirty && local.updatedAt > remote.updatedAt) {
            return Resolution(local, needsManualReview = true)
        }
        // last-write-wins
        val winner = if (local.updatedAt >= remote.updatedAt) local else remote
        return Resolution(winner.copy(dirty = false), needsManualReview = false)
    }
}
