import Foundation
import BackgroundTasks
import RealmSwift
import Alamofire

final class OfflineQueueSync {
    static let shared = OfflineQueueSync()
    private let identifier = "co.il.syncup.catering.offline-sync"

    private init() {}

    func scheduleNextSync(after seconds: TimeInterval = 60 * 15) {
        let request = BGProcessingTaskRequest(identifier: identifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: seconds)
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Failed to schedule BG task: \(error)")
        }
    }

    func handleBackgroundTask(task: BGProcessingTask) {
        scheduleNextSync()
        let operation = SyncOperation()
        task.expirationHandler = { operation.cancel() }
        operation.completionBlock = { task.setTaskCompleted(success: !operation.isCancelled) }
        OperationQueue().addOperation(operation)
    }

    func syncNow(completion: ((Bool) -> Void)? = nil) {
        let op = SyncOperation()
        op.completionBlock = { completion?(!op.isCancelled) }
        OperationQueue().addOperation(op)
    }
}

final class SyncOperation: Operation {
    override func main() {
        guard !isCancelled else { return }
        let realm = try? Realm()
        guard let items = realm?.objects(OfflineQueueItem.self).sorted(byKeyPath: "createdAt") else { return }
        let group = DispatchGroup()
        for item in items {
            if isCancelled { break }
            group.enter()
            sendItem(item) { success in
                if success, let realm = try? Realm() {
                    try? realm.write {
                        if let live = realm.object(ofType: OfflineQueueItem.self, forPrimaryKey: item.id) {
                            realm.delete(live)
                        }
                    }
                } else if let realm = try? Realm() {
                    try? realm.write {
                        if let live = realm.object(ofType: OfflineQueueItem.self, forPrimaryKey: item.id) {
                            live.retries += 1
                        }
                    }
                }
                group.leave()
            }
        }
        group.wait()
    }

    private func sendItem(_ item: OfflineQueueItem, done: @escaping (Bool) -> Void) {
        let url = URL(string: "https://api.catering.syncup.co.il/v1\(item.endpoint)")!
        var req = URLRequest(url: url)
        req.httpMethod = item.method
        req.httpBody = item.payload
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainTokenStore.shared.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        AF.request(req).validate().response { resp in
            done(resp.error == nil)
        }
    }
}
