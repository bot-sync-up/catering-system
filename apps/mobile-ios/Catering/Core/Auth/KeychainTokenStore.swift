import Foundation
import KeychainSwift

final class KeychainTokenStore {
    static let shared = KeychainTokenStore()
    private let keychain: KeychainSwift

    private let accessKey = "catering.access_token"
    private let refreshKey = "catering.refresh_token"
    private let expiryKey = "catering.expiry"

    private init() {
        keychain = KeychainSwift(keyPrefix: "syncup.catering.")
        keychain.accessGroup = nil
        keychain.synchronizable = false
    }

    var accessToken: String? { keychain.get(accessKey) }
    var refreshToken: String? { keychain.get(refreshKey) }
    var expiry: Date? {
        guard let s = keychain.get(expiryKey), let t = TimeInterval(s) else { return nil }
        return Date(timeIntervalSince1970: t)
    }

    func save(pair: TokenPair) {
        keychain.set(pair.accessToken, forKey: accessKey, withAccess: .accessibleWhenUnlockedThisDeviceOnly)
        keychain.set(pair.refreshToken, forKey: refreshKey, withAccess: .accessibleWhenUnlockedThisDeviceOnly)
        let exp = Date().addingTimeInterval(TimeInterval(pair.expiresIn))
        keychain.set("\(exp.timeIntervalSince1970)", forKey: expiryKey)
    }

    func clear() {
        keychain.delete(accessKey)
        keychain.delete(refreshKey)
        keychain.delete(expiryKey)
    }

    var hasValidToken: Bool {
        guard let _ = accessToken, let e = expiry else { return false }
        return e > Date()
    }
}
