package co.il.catering.data

import co.il.catering.core.storage.entity.CachedOrderEntity
import co.il.catering.core.storage.entity.CachedTaskEntity
import co.il.catering.data.remote.dto.*
import co.il.catering.domain.model.*
import java.time.Instant

private fun parseIso(s: String?): Instant? =
    s?.let { runCatching { Instant.parse(it) }.getOrNull() }

fun OrderDto.toDomain(): Order = Order(
    id = id,
    customerId = customerId,
    customerName = customerName,
    eventDate = parseIso(eventDate) ?: Instant.now(),
    status = runCatching { OrderStatus.valueOf(status.uppercase()) }.getOrDefault(OrderStatus.PENDING),
    totalAmount = totalAmount,
    paidAmount = paidAmount,
    address = address,
    notes = notes,
)

fun Order.toEntity(dirty: Boolean = false): CachedOrderEntity = CachedOrderEntity(
    id = id,
    customerId = customerId,
    customerName = customerName,
    eventDate = eventDate.toEpochMilli(),
    status = status.name,
    totalAmount = totalAmount,
    paidAmount = paidAmount,
    address = address,
    notes = notes,
    dirty = dirty,
)

fun CachedOrderEntity.toDomain(): Order = Order(
    id = id,
    customerId = customerId,
    customerName = customerName,
    eventDate = Instant.ofEpochMilli(eventDate),
    status = runCatching { OrderStatus.valueOf(status) }.getOrDefault(OrderStatus.PENDING),
    totalAmount = totalAmount,
    paidAmount = paidAmount,
    address = address,
    notes = notes,
)

fun CustomerDto.toDomain() = Customer(id, name, phone, email, address, notes, tags)

fun LeadDto.toDomain() = Lead(
    id, name, phone, email, source,
    runCatching { LeadStage.valueOf(stage.uppercase()) }.getOrDefault(LeadStage.NEW),
    estimatedValue, notes,
)

fun PrepTaskDto.toDomain() = PrepTask(
    id, orderId, item, quantity, unit,
    runCatching { TaskStatus.valueOf(status.uppercase()) }.getOrDefault(TaskStatus.PENDING),
    notes,
)

fun DeliveryDto.toDomain() = Delivery(
    id, orderId, driverId, address, lat, lng,
    runCatching { DeliveryStatus.valueOf(status.uppercase()) }.getOrDefault(DeliveryStatus.PENDING),
    signatureUrl, proofPhotoUrl, parseIso(deliveredAt),
)

fun ShiftDto.toDomain() = Shift(
    id, userId,
    runCatching { UserRole.valueOf(role.uppercase()) }.getOrDefault(UserRole.SHIFT),
    parseIso(startsAt) ?: Instant.now(),
    parseIso(endsAt) ?: Instant.now(),
    parseIso(clockInAt),
    parseIso(clockOutAt),
    location,
)

fun Task.toEntity(dirty: Boolean = false) = CachedTaskEntity(
    id, orderId, title, description, assigneeId, role.name,
    dueAt?.toEpochMilli(), status.name, dirty = dirty,
)

fun CachedTaskEntity.toDomain() = Task(
    id, orderId, title, description, assigneeId,
    runCatching { UserRole.valueOf(role) }.getOrDefault(UserRole.SHIFT),
    dueAt?.let { Instant.ofEpochMilli(it) },
    runCatching { TaskStatus.valueOf(status) }.getOrDefault(TaskStatus.PENDING),
)
