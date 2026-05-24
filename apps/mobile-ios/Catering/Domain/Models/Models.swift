import Foundation

enum UserRole: String, Codable, CaseIterable {
    case manager, agent, kitchen, shift, driver, customer, none
}

struct User: Identifiable, Codable, Equatable {
    let id: String
    let fullName: String
    let role: UserRole
    let phone: String
    let photoUrl: String?
}

struct Order: Identifiable, Codable, Equatable {
    let id: String
    let customerName: String
    let address: String
    let lat: Double
    let lng: Double
    var status: OrderStatus
    let totalAmount: Double
    let deliveryAt: Date
    let notes: String?
    let items: [OrderItem]
}

struct OrderItem: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let qty: Int
    let unitPrice: Double
}

enum OrderStatus: String, Codable {
    case draft, confirmed, inPrep = "in_prep", readyForDelivery = "ready_for_delivery", outForDelivery = "out_for_delivery", delivered, cancelled
}

struct TaskItem: Identifiable, Codable, Equatable {
    let id: String
    let orderId: String?
    let title: String
    let assigneeId: String
    let dueAt: Date
    var status: TaskStatus
}

enum TaskStatus: String, Codable { case pending, inProgress = "in_progress", done, blocked }

struct Lead: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let phone: String
    let email: String?
    let stage: LeadStage
    let estimatedValue: Double?
    let notes: String?
}

enum LeadStage: String, Codable { case new, contacted, quoteSent = "quote_sent", won, lost }

struct ShiftRecord: Identifiable, Codable, Equatable {
    let id: String
    let userId: String
    let startAt: Date
    let endAt: Date?
    let location: GeoPoint?
}

struct GeoPoint: Codable, Equatable {
    let lat: Double
    let lng: Double
}

struct Delivery: Identifiable, Codable, Equatable {
    let id: String
    let orderId: String
    let driverId: String
    var status: DeliveryStatus
    let etaMinutes: Int?
    let signaturePngBase64: String?
    let proofPhotoUrl: String?
}

enum DeliveryStatus: String, Codable { case assigned, picked, enRoute = "en_route", delivered, failed }
