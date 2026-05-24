import Foundation
import Combine
import SwiftyJSON

protocol OrderRepository {
    func fetchToday() -> AnyPublisher<[Order], APIError>
    func update(_ order: Order) -> AnyPublisher<Order, APIError>
}

protocol TaskRepository {
    func fetch(assignee: String?) -> AnyPublisher<[TaskItem], APIError>
    func markDone(taskId: String, note: String?) -> AnyPublisher<TaskItem, APIError>
}

protocol ShiftRepository {
    func clockIn(location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError>
    func clockOut(shiftId: String, location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError>
    func myShifts() -> AnyPublisher<[ShiftRecord], APIError>
    func requestSwap(shiftId: String, withUserId: String) -> AnyPublisher<EmptyResponse, APIError>
}

protocol DeliveryRepository {
    func myDeliveries() -> AnyPublisher<[Delivery], APIError>
    func uploadProof(deliveryId: String, jpegData: Data) -> AnyPublisher<Delivery, APIError>
    func uploadSignature(deliveryId: String, pngData: Data) -> AnyPublisher<Delivery, APIError>
}

protocol OcrRepository {
    func scanInvoice(jpegData: Data) -> AnyPublisher<InvoiceOcrResult, APIError>
}

protocol LeadRepository {
    func list() -> AnyPublisher<[Lead], APIError>
    func update(_ lead: Lead) -> AnyPublisher<Lead, APIError>
}

protocol AuthRepository {
    func login(email: String, password: String) -> AnyPublisher<(User, TokenPair), APIError>
    func logout() -> AnyPublisher<EmptyResponse, APIError>
}

// MARK: - Implementations

final class OrderRepositoryImpl: OrderRepository {
    func fetchToday() -> AnyPublisher<[Order], APIError> {
        APIClient.shared.request("/orders/today", as: [Order].self)
    }
    func update(_ order: Order) -> AnyPublisher<Order, APIError> {
        APIClient.shared.request("/orders/\(order.id)", method: .put, params: order.asDictionary(), as: Order.self)
    }
}

final class TaskRepositoryImpl: TaskRepository {
    func fetch(assignee: String?) -> AnyPublisher<[TaskItem], APIError> {
        var params: [String: Any] = [:]
        if let a = assignee { params["assignee_id"] = a }
        return APIClient.shared.request("/tasks", params: params, as: [TaskItem].self)
    }
    func markDone(taskId: String, note: String?) -> AnyPublisher<TaskItem, APIError> {
        APIClient.shared.request("/tasks/\(taskId)/done", method: .post, params: ["note": note ?? ""], as: TaskItem.self)
    }
}

final class ShiftRepositoryImpl: ShiftRepository {
    func clockIn(location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError> {
        var params: [String: Any] = [:]
        if let l = location { params["lat"] = l.lat; params["lng"] = l.lng }
        return APIClient.shared.request("/shifts/clock-in", method: .post, params: params, as: ShiftRecord.self)
    }
    func clockOut(shiftId: String, location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError> {
        var params: [String: Any] = [:]
        if let l = location { params["lat"] = l.lat; params["lng"] = l.lng }
        return APIClient.shared.request("/shifts/\(shiftId)/clock-out", method: .post, params: params, as: ShiftRecord.self)
    }
    func myShifts() -> AnyPublisher<[ShiftRecord], APIError> {
        APIClient.shared.request("/shifts/me", as: [ShiftRecord].self)
    }
    func requestSwap(shiftId: String, withUserId: String) -> AnyPublisher<EmptyResponse, APIError> {
        APIClient.shared.request("/shifts/\(shiftId)/swap", method: .post, params: ["with_user_id": withUserId], as: EmptyResponse.self)
    }
}

final class DeliveryRepositoryImpl: DeliveryRepository {
    func myDeliveries() -> AnyPublisher<[Delivery], APIError> {
        APIClient.shared.request("/deliveries/me", as: [Delivery].self)
    }
    func uploadProof(deliveryId: String, jpegData: Data) -> AnyPublisher<Delivery, APIError> {
        APIClient.shared.upload("/deliveries/\(deliveryId)/proof", data: jpegData, mime: "image/jpeg")
            .tryMap { json -> Delivery in
                let data = try json.rawData()
                return try JSONDecoder.iso.decode(Delivery.self, from: data)
            }
            .mapError { _ in APIError.decoding }
            .eraseToAnyPublisher()
    }
    func uploadSignature(deliveryId: String, pngData: Data) -> AnyPublisher<Delivery, APIError> {
        APIClient.shared.upload("/deliveries/\(deliveryId)/signature", data: pngData, mime: "image/png")
            .tryMap { json -> Delivery in
                let data = try json.rawData()
                return try JSONDecoder.iso.decode(Delivery.self, from: data)
            }
            .mapError { _ in APIError.decoding }
            .eraseToAnyPublisher()
    }
}

final class OcrRepositoryImpl: OcrRepository {
    func scanInvoice(jpegData: Data) -> AnyPublisher<InvoiceOcrResult, APIError> {
        APIClient.shared.upload("/ocr/invoice", data: jpegData, mime: "image/jpeg")
            .tryMap { json -> InvoiceOcrResult in
                let data = try json.rawData()
                return try JSONDecoder.iso.decode(InvoiceOcrResult.self, from: data)
            }
            .mapError { _ in APIError.decoding }
            .eraseToAnyPublisher()
    }
}

final class LeadRepositoryImpl: LeadRepository {
    func list() -> AnyPublisher<[Lead], APIError> {
        APIClient.shared.request("/leads", as: [Lead].self)
    }
    func update(_ lead: Lead) -> AnyPublisher<Lead, APIError> {
        APIClient.shared.request("/leads/\(lead.id)", method: .put, params: lead.asDictionary(), as: Lead.self)
    }
}

struct LoginResponse: Decodable {
    let user: User
    let tokens: TokenPair
}

final class AuthRepositoryImpl: AuthRepository {
    func login(email: String, password: String) -> AnyPublisher<(User, TokenPair), APIError> {
        APIClient.shared.request("/auth/login", method: .post, params: ["email": email, "password": password], as: LoginResponse.self)
            .map { ($0.user, $0.tokens) }
            .eraseToAnyPublisher()
    }
    func logout() -> AnyPublisher<EmptyResponse, APIError> {
        APIClient.shared.request("/auth/logout", method: .post, as: EmptyResponse.self)
    }
}

extension JSONDecoder {
    static var iso: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }
}

extension Encodable {
    func asDictionary() -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        guard let data = try? encoder.encode(self),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return dict
    }
}
