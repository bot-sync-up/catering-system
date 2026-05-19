package co.il.catering

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DndGateTest {

    // בדיקה לוגית של חישוב טווח שעות שקטות.
    @Test
    fun `quiet range across midnight`() {
        val startH = 22
        val endH = 8
        fun isQuiet(hour: Int): Boolean =
            if (startH < endH) hour in startH until endH else hour >= startH || hour < endH
        assertTrue(isQuiet(23))
        assertTrue(isQuiet(2))
        assertFalse(isQuiet(10))
        assertFalse(isQuiet(17))
    }
}
