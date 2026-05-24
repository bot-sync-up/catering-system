import Foundation
import LocalAuthentication

enum BiometricType {
    case none, touchID, faceID, opticID
}

final class BiometricAuthenticator {
    static let shared = BiometricAuthenticator()
    private init() {}

    var biometricType: BiometricType {
        let ctx = LAContext()
        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err) else { return .none }
        switch ctx.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        @unknown default: return .none
        }
    }

    func authenticate(reason: String = "אימות זהות לכניסה ל-Catering",
                      completion: @escaping (Result<Void, Error>) -> Void) {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = "השתמש בקוד סודי"
        ctx.localizedCancelTitle = "ביטול"

        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else {
            completion(.failure(err ?? NSError(domain: "BiometricAuth", code: -1)))
            return
        }
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
            DispatchQueue.main.async {
                if ok { completion(.success(())) }
                else { completion(.failure(error ?? NSError(domain: "BiometricAuth", code: -2))) }
            }
        }
    }
}
