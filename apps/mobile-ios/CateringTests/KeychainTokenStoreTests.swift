import XCTest
@testable import CateringCore

final class KeychainTokenStoreTests: XCTestCase {
    override func tearDown() { KeychainTokenStore.shared.clear() }

    func testSaveAndRead() {
        let pair = TokenPair(accessToken: "AT", refreshToken: "RT", expiresIn: 3600)
        KeychainTokenStore.shared.save(pair: pair)
        XCTAssertEqual(KeychainTokenStore.shared.accessToken, "AT")
        XCTAssertEqual(KeychainTokenStore.shared.refreshToken, "RT")
        XCTAssertTrue(KeychainTokenStore.shared.hasValidToken)
    }

    func testClear() {
        let pair = TokenPair(accessToken: "AT", refreshToken: "RT", expiresIn: 3600)
        KeychainTokenStore.shared.save(pair: pair)
        KeychainTokenStore.shared.clear()
        XCTAssertNil(KeychainTokenStore.shared.accessToken)
    }
}
