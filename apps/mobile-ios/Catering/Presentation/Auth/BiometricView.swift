import SwiftUI

struct BiometricView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    @State private var status = "ממתין לאימות..."

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "faceid").resizable().scaledToFit().frame(width: 100, height: 100).foregroundColor(.blue)
            Text("auth.biometric".localized).font(.title2.bold())
            Text(status).foregroundColor(.secondary)
            Spacer()
        }
        .padding()
        .onAppear { authenticate() }
        .rtl()
    }

    private func authenticate() {
        BiometricAuthenticator.shared.authenticate { result in
            switch result {
            case .success:
                if KeychainTokenStore.shared.hasValidToken {
                    appState.isAuthenticated = true
                    dismiss()
                } else {
                    status = "אין טוקן שמור — יש להתחבר עם דוא\"ל וסיסמה"
                }
            case .failure(let err):
                status = err.localizedDescription
            }
        }
    }
}
