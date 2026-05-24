import XCTest
@testable import CateringCore

final class QuietHoursTests: XCTestCase {
    func testInsideQuietHoursAt23() {
        var comps = DateComponents(); comps.year = 2026; comps.month = 5; comps.day = 24; comps.hour = 23
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "Asia/Jerusalem")!
        let date = cal.date(from: comps)!
        XCTAssertTrue(QuietHours.shared.isInsideQuietHours(date))
    }

    func testOutsideQuietHoursAt10() {
        var comps = DateComponents(); comps.year = 2026; comps.month = 5; comps.day = 24; comps.hour = 10
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "Asia/Jerusalem")!
        let date = cal.date(from: comps)!
        XCTAssertFalse(QuietHours.shared.isInsideQuietHours(date))
    }

    func testEdgeAt8AmIsNotQuiet() {
        var comps = DateComponents(); comps.hour = 8
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "Asia/Jerusalem")!
        let date = cal.date(from: comps)!
        XCTAssertFalse(QuietHours.shared.isInsideQuietHours(date))
    }

    func testEdgeAt7AmIsQuiet() {
        var comps = DateComponents(); comps.hour = 7
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "Asia/Jerusalem")!
        let date = cal.date(from: comps)!
        XCTAssertTrue(QuietHours.shared.isInsideQuietHours(date))
    }
}
