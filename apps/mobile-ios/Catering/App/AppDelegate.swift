import UIKit
import FirebaseMessaging
import UserNotifications
import BackgroundTasks

final class AppDelegate: NSObject, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {

        UNUserNotificationCenter.current().delegate = FCMManager.shared
        Messaging.messaging().delegate = FCMManager.shared

        application.registerForRemoteNotifications()
        FCMManager.shared.requestAuthorization()
        FCMManager.shared.registerNotificationCategories()

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "co.il.syncup.catering.offline-sync",
            using: nil
        ) { task in
            OfflineQueueSync.shared.handleBackgroundTask(task: task as! BGProcessingTask)
        }

        OfflineQueueSync.shared.scheduleNextSync()

        return true
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }
}
