package co.il.catering

import co.il.catering.core.storage.entity.CachedOrderEntity
import co.il.catering.core.sync.ConflictResolver
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class ConflictResolverTest {
    private val resolver = ConflictResolver()

    private fun e(id: String = "1", status: String = "PENDING", updated: Long = 0L, dirty: Boolean = false) =
        CachedOrderEntity(
            id = id, customerId = "c", customerName = "x", eventDate = 0,
            status = status, totalAmount = 0.0, paidAmount = 0.0,
            address = null, notes = null, updatedAt = updated, dirty = dirty,
        )

    @Test
    fun `dirty local newer wins and needs review`() {
        val local = e(updated = 200, dirty = true, status = "CONFIRMED")
        val remote = e(updated = 100, status = "PENDING")
        val res = resolver.resolveOrder(local, remote)
        assertEquals("CONFIRMED", res.winner.status)
        assertTrue(res.needsManualReview)
    }

    @Test
    fun `clean remote newer wins`() {
        val local = e(updated = 100)
        val remote = e(updated = 200, status = "DELIVERED")
        val res = resolver.resolveOrder(local, remote)
        assertEquals("DELIVERED", res.winner.status)
        assertFalse(res.winner.dirty)
        assertFalse(res.needsManualReview)
    }
}
