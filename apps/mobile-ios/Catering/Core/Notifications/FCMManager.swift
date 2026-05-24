import Foundation
import UserNotifications
import FirebaseMessaging
import UIKit

final class FCMManager: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    static let shared = FCMManager()
    private override init() { super.init() }

    enum Category: String, CaseIterable {
        case newOrder = "NEW_ORDER"
        case taskAssigned = "TASK_ASSIGNED"
        case deliveryUpdate = "DELIVERY_UPDATE"
        case shiftReminder = "SHIFT_REMINDER"
        case payrollNotice = "PAYROLL_NOTICE"
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound, .providesAppNotificationSettings]) { _, _ in }
    }

    func registerNotificationCategories() {
        var categories = Set<UNNotificationCategory>()
        for c in Category.allCases {
            let actions = actionsFor(c)
            let cat = UNNotificationCategory(identifier: c.rawValue, actions: actions, intentIdentifiers: [], options: [.customDismissAction])
            categories.insert(cat)
        }
        UNUserNotificationCenter.current().setNotificationCategories(categories)
    }

    private func actionsFor(_ c: Category) -> [UNNotificationAction] {
        switch c {
        case .newOrder:
            return [
                UNNotificationAction(identifier: "ACCEPT", title: "אישור", options: [.foreground]),
                UNNotificationAction(identifier: "REJECT", title: "דחייה", options: [.destructive])
            ]
        case .taskAssigned:
            return [UNNotificationAction(identifier: "DONE", title: "סיימתי", options: [])]
        case .deliveryUpdate:
            return [UNNotificationAction(identifier: "VIEW", title: "צפייה", options: [.foreground])]
        case .shiftReminder:
            return [UNNotificationAction(identifier: "CLOCK_IN", title: "כניסה למשמרת", options: [.foreground])]
        case .payrollNotice:
            return [UNNotificationAction(identifier: "OPEN_SLIP", title: "פתח תלוש", options: [.foreground])]
        }
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        APIClient.shared.request("/devices/register", method: .post, params: ["fcm_token": token, "platform": "ios"], as: EmptyResponse.self)
            .sink(receiveCompletion: { _ in }, receiveValue: { _ in })
            .store(in: &cancellables)
    }

    private var cancellables = Set<AnyCancellable>()

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if QuietHours.shared.isInsideQuietHours(Date()) && notification.request.content.categoryIdentifier != Category.newOrder.rawValue {
            completionHandler([])
            return
        }
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let action = response.actionIdentifier
        let category = response.notification.request.content.categoryIdentifier
        NotificationCenter.default.post(name: .cateringNotificationAction, object: nil, userInfo: ["action": action, "category": category])
        completionHandler()
    }
}

struct EmptyResponse: Decodable {}

extension Notification.Name {
    static let cateringNotificationAction = Notification.Name("catering.notification.action")
}

import Combine
