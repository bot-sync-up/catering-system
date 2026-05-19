package co.il.catering

import co.il.catering.data.remote.dto.OrderDto
import co.il.catering.data.toDomain
import co.il.catering.domain.model.OrderStatus
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class MapperTest {

    @Test
    fun `OrderDto to domain handles unknown status as PENDING`() {
        val dto = OrderDto(
            id = "1", customerId = "c", customerName = "x",
            eventDate = "2030-01-01T00:00:00Z",
            status = "WHATEVER",
            totalAmount = 100.0, paidAmount = 0.0,
        )
        val order = dto.toDomain()
        assertEquals(OrderStatus.PENDING, order.status)
    }

    @Test
    fun `OrderDto to domain maps DELIVERED`() {
        val dto = OrderDto(
            id = "1", customerId = "c", customerName = "x",
            eventDate = "2030-01-01T00:00:00Z",
            status = "DELIVERED", totalAmount = 0.0, paidAmount = 0.0,
        )
        assertEquals(OrderStatus.DELIVERED, dto.toDomain().status)
    }
}
