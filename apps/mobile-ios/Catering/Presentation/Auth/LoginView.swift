import SwiftUI
import Combine

final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var error: String?
    @Published var isLoading = false
    private var bag = Set<AnyCancellable>()
    private let repo: AuthRepository
    init(repo: AuthRepository = AuthRepositoryImpl()) { self.repo = repo }

    func login(appState: AppState) {
        isLoading = true; error = nil
        repo.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case let .failure(err) = completion { self?.error = err.errorDescription }
            } receiveValue: { user, tokens in
                KeychainTokenStore.shared.save(pair: tokens)
                appState.currentUser = user
                appState.role = user.role
                appState.isAuthenticated = true
            }
            .store(in: &bag)
    }
}

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = LoginViewModel()
    @State private var showBiometric = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "fork.knife.circle.fill")
                    .resizable().scaledToFit().frame(width: 120, height: 120).foregroundColor(.orange)
                Text("auth.login".localized).font(.title.bold())
                TextField("auth.email".localized, text: $vm.email)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                SecureField("auth.password".localized, text: $vm.password)
                    .textFieldStyle(.roundedBorder)
                if let e = vm.error { Text(e).foregroundColor(.red).font(.footnote) }
                Button(action: { vm.login(appState: appState) }) {
                    if vm.isLoading { ProgressView() }
                    else { Text("auth.submit".localized).frame(maxWidth: .infinity) }
                }
                .buttonStyle(.borderedProminent)
                .disabled(vm.isLoading || vm.email.isEmpty || vm.password.isEmpty)

                if BiometricAuthenticator.shared.biometricType == .faceID {
                    Button("auth.biometric".localized) { showBiometric = true }
                        .buttonStyle(.bordered)
                }
                Spacer()
            }
            .padding()
            .sheet(isPresented: $showBiometric) { BiometricView() }
            .rtl()
        }
    }
}
