import Foundation
import Combine
import UIKit

protocol GetTodayOrdersUseCase {
    func execute() -> AnyPublisher<[Order], APIError>
}

protocol ClockInUseCase {
    func execute(at location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError>
}

protocol ClockOutUseCase {
    func execute(shiftId: String, at location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError>
}

protocol MarkTaskDoneUseCase {
    func execute(taskId: String, note: String?) -> AnyPublisher<TaskItem, APIError>
}

protocol UploadDeliveryProofUseCase {
    func execute(deliveryId: String, image: UIImage) -> AnyPublisher<Delivery, APIError>
}

protocol ScanInvoiceOcrUseCase {
    func execute(image: UIImage) -> AnyPublisher<InvoiceOcrResult, APIError>
}

protocol CaptureSignatureUseCase {
    func execute(deliveryId: String, pngData: Data) -> AnyPublisher<Delivery, APIError>
}

struct InvoiceOcrResult: Codable, Equatable {
    let vendor: String?
    let totalAmount: Double?
    let invoiceNumber: String?
    let rawText: String?
}

final class GetTodayOrders: GetTodayOrdersUseCase {
    private let repo: OrderRepository
    init(repo: OrderRepository = OrderRepositoryImpl()) { self.repo = repo }
    func execute() -> AnyPublisher<[Order], APIError> { repo.fetchToday() }
}

final class ClockIn: ClockInUseCase {
    private let repo: ShiftRepository
    init(repo: ShiftRepository = ShiftRepositoryImpl()) { self.repo = repo }
    func execute(at location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError> { repo.clockIn(location: location) }
}

final class ClockOut: ClockOutUseCase {
    private let repo: ShiftRepository
    init(repo: ShiftRepository = ShiftRepositoryImpl()) { self.repo = repo }
    func execute(shiftId: String, at location: GeoPoint?) -> AnyPublisher<ShiftRecord, APIError> { repo.clockOut(shiftId: shiftId, location: location) }
}

final class MarkTaskDone: MarkTaskDoneUseCase {
    private let repo: TaskRepository
    init(repo: TaskRepository = TaskRepositoryImpl()) { self.repo = repo }
    func execute(taskId: String, note: String?) -> AnyPublisher<TaskItem, APIError> { repo.markDone(taskId: taskId, note: note) }
}

final class UploadDeliveryProof: UploadDeliveryProofUseCase {
    private let repo: DeliveryRepository
    init(repo: DeliveryRepository = DeliveryRepositoryImpl()) { self.repo = repo }
    func execute(deliveryId: String, image: UIImage) -> AnyPublisher<Delivery, APIError> {
        guard let data = image.jpegData(compressionQuality: 0.7) else {
            return Fail(error: .decoding).eraseToAnyPublisher()
        }
        return repo.uploadProof(deliveryId: deliveryId, jpegData: data)
    }
}

final class ScanInvoiceOcr: ScanInvoiceOcrUseCase {
    private let repo: OcrRepository
    init(repo: OcrRepository = OcrRepositoryImpl()) { self.repo = repo }
    func execute(image: UIImage) -> AnyPublisher<InvoiceOcrResult, APIError> {
        guard let data = image.jpegData(compressionQuality: 0.8) else {
            return Fail(error: .decoding).eraseToAnyPublisher()
        }
        return repo.scanInvoice(jpegData: data)
    }
}

final class CaptureSignature: CaptureSignatureUseCase {
    private let repo: DeliveryRepository
    init(repo: DeliveryRepository = DeliveryRepositoryImpl()) { self.repo = repo }
    func execute(deliveryId: String, pngData: Data) -> AnyPublisher<Delivery, APIError> {
        repo.uploadSignature(deliveryId: deliveryId, pngData: pngData)
    }
}
