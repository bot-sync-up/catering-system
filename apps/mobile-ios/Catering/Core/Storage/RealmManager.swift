import Foundation
import RealmSwift

final class CachedUser: Object {
    @Persisted(primaryKey: true) var id: String
    @Persisted var fullName: String
    @Persisted var role: String
    @Persisted var phone: String
    @Persisted var photoUrl: String?
    @Persisted var updatedAt: Date = Date()
}

final class CachedOrder: Object {
    @Persisted(primaryKey: true) var id: String
    @Persisted var customerName: String
    @Persisted var address: String
    @Persisted var lat: Double
    @Persisted var lng: Double
    @Persisted var status: String
    @Persisted var totalAmount: Double
    @Persisted var deliveryAt: Date
    @Persisted var notes: String?
    @Persisted var syncDirty: Bool = false
}

final class CachedTask: Object {
    @Persisted(primaryKey: true) var id: String
    @Persisted var orderId: String?
    @Persisted var title: String
    @Persisted var assigneeId: String
    @Persisted var dueAt: Date
    @Persisted var status: String
    @Persisted var syncDirty: Bool = false
}

final class OfflineQueueItem: Object {
    @Persisted(primaryKey: true) var id: String = UUID().uuidString
    @Persisted var endpoint: String
    @Persisted var method: String
    @Persisted var payload: Data
    @Persisted var createdAt: Date = Date()
    @Persisted var retries: Int = 0
    @Persisted var lastError: String?
}

final class CachedPhoto: Object {
    @Persisted(primaryKey: true) var id: String = UUID().uuidString
    @Persisted var orderId: String?
    @Persisted var localPath: String
    @Persisted var uploaded: Bool = false
    @Persisted var kind: String
    @Persisted var capturedAt: Date = Date()
}

final class RealmManager {
    static let shared = RealmManager()
    private(set) var realm: Realm

    private init() {
        let config = Realm.Configuration(
            schemaVersion: 1,
            migrationBlock: { _, _ in },
            objectTypes: [CachedUser.self, CachedOrder.self, CachedTask.self, OfflineQueueItem.self, CachedPhoto.self]
        )
        Realm.Configuration.defaultConfiguration = config
        self.realm = try! Realm()
    }

    func write(_ block: (Realm) throws -> Void) {
        do {
            try realm.write { try block(realm) }
        } catch {
            print("Realm write error: \(error)")
        }
    }

    func queueOffline(endpoint: String, method: String, payload: Data) {
        write { r in
            let item = OfflineQueueItem()
            item.endpoint = endpoint
            item.method = method
            item.payload = payload
            r.add(item)
        }
    }

    func clearAll() {
        write { r in r.deleteAll() }
    }
}
