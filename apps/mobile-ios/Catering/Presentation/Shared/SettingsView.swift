import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Form {
            if let user = appState.currentUser {
                Section("משתמש") {
                    LabeledContent("שם", value: user.fullName)
                    LabeledContent("טלפון", value: user.phone)
                    LabeledContent("תפקיד", value: user.role.rawValue)
                }
            }
            Section("התראות") {
                Text("quiet_hours.info".localized).foregroundColor(.secondary)
            }
            Section("סנכרון") {
                Button("סנכרן עכשיו") { OfflineQueueSync.shared.syncNow() }
            }
            Section("כלים") {
                NavigationLink("shared.scan_invoice".localized, destination: CameraOcrView())
            }
            Section {
                Button("shared.logout".localized, role: .destructive) {
                    KeychainTokenStore.shared.clear()
                    RealmManager.shared.clearAll()
                    appState.isAuthenticated = false
                    appState.currentUser = nil
                    appState.role = .none
                }
            }
        }
        .navigationTitle("shared.settings".localized)
        .rtl()
    }
}
