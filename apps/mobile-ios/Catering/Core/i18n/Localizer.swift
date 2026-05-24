import Foundation
import SwiftUI

enum L10n {
    static func t(_ key: String, _ args: CVarArg...) -> String {
        let format = NSLocalizedString(key, comment: "")
        return String(format: format, locale: Locale(identifier: "he_IL"), arguments: args)
    }
}

extension String {
    var localized: String { L10n.t(self) }
}

struct RTLModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .environment(\.layoutDirection, .rightToLeft)
            .environment(\.locale, Locale(identifier: "he_IL"))
    }
}

extension View {
    func rtl() -> some View { modifier(RTLModifier()) }
}
