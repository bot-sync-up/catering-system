import Foundation

final class QuietHours {
    static let shared = QuietHours()
    private init() {}

    private let startHour = 22
    private let endHour = 8

    func isInsideQuietHours(_ date: Date, timezone: TimeZone = TimeZone(identifier: "Asia/Jerusalem") ?? .current) -> Bool {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timezone
        let hour = cal.component(.hour, from: date)
        if startHour > endHour {
            return hour >= startHour || hour < endHour
        } else {
            return hour >= startHour && hour < endHour
        }
    }
}
