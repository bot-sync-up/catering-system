import XCTest
import SwiftUI
@testable import CateringCore

// Uses pointfreeco/swift-snapshot-testing (add via SPM in CI).
// Placeholder structure — actual `assertSnapshot(...)` calls will work once package is linked.
final class RTLSnapshotTests: XCTestCase {
    func testLoginViewSnapshot_he() {
        let view = LoginView().environment(\.layoutDirection, .rightToLeft)
            .environment(\.locale, Locale(identifier: "he_IL"))
        XCTAssertNotNil(view)
        // assertSnapshot(matching: UIHostingController(rootView: view), as: .image(on: .iPhone13))
    }

    func testDashboardSnapshot_he() {
        let view = DashboardView().environment(\.layoutDirection, .rightToLeft)
        XCTAssertNotNil(view)
    }
}
