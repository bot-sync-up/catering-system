package co.il.catering.presentation.navigation

object Routes {
    const val LOGIN = "login"
    const val BIOMETRIC = "biometric"

    // Manager
    const val MANAGER_DASHBOARD = "manager/dashboard"

    // Agent
    const val AGENT_CRM = "agent/crm"
    const val AGENT_LEAD_DETAIL = "agent/lead/{leadId}"
    fun agentLead(leadId: String) = "agent/lead/$leadId"

    // Kitchen
    const val KITCHEN_PREP = "kitchen/prep"
    const val KITCHEN_MARK_DONE = "kitchen/mark/{taskId}"
    fun kitchenMark(taskId: String) = "kitchen/mark/$taskId"

    // Shift
    const val SHIFT_CLOCK = "shift/clock"
    const val SHIFT_LIST = "shift/list"
    const val SHIFT_SWAP = "shift/swap/{shiftId}"
    fun shiftSwap(shiftId: String) = "shift/swap/$shiftId"

    // Driver
    const val DRIVER_LIST = "driver/deliveries"
    const val DRIVER_NAVIGATE = "driver/navigate/{deliveryId}"
    fun driverNavigate(id: String) = "driver/navigate/$id"
    const val DRIVER_SIGNATURE = "driver/signature/{deliveryId}"
    fun driverSignature(id: String) = "driver/signature/$id"

    // Customer
    const val CUSTOMER_ORDERS = "customer/orders"
    const val CUSTOMER_NEW_ORDER = "customer/new-order"
    const val CUSTOMER_STATUS = "customer/status/{orderId}"
    fun customerStatus(id: String) = "customer/status/$id"

    // Shared
    const val CAMERA_OCR = "shared/camera-ocr"
    const val BARCODE = "shared/barcode"
    const val SETTINGS = "shared/settings"
}
