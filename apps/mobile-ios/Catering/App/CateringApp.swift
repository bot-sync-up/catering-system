import SwiftUI
import FirebaseCore
import Sentry

@main
struct CateringApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var appState = AppState()

    init() {
        FirebaseApp.configure()
        SentrySDK.start { options in
            options.dsn = ProcessInfo.processInfo.environment["SENTRY_DSN"] ?? ""
            options.tracesSampleRate = 0.2
            options.profilesSampleRate = 0.1
            options.enableAutoPerformanceTracing = true
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "he_IL"))
        }
    }
}

final class AppState: ObservableObject {
    @Published var currentUser: User?
    @Published var role: UserRole = .none
    @Published var isAuthenticated: Bool = false
}
