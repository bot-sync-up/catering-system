import SwiftUI
import Combine

struct RequestSwapView: View {
    let shift: ShiftRecord
    @State private var withUserId = ""
    @State private var status: String?
    @State private var bag = Set<AnyCancellable>()

    var body: some View {
        Form {
            Section("פרטי משמרת") {
                Text(shift.startAt.formatted())
            }
            Section("עובד לתחלופה") {
                TextField("מזהה משתמש", text: $withUserId)
            }
            Section {
                Button("שלח בקשה") { submit() }.disabled(withUserId.isEmpty)
                if let s = status { Text(s).foregroundColor(.green) }
            }
        }
        .navigationTitle("shift.request_swap".localized)
        .rtl()
    }

    private func submit() {
        ShiftRepositoryImpl().requestSwap(shiftId: shift.id, withUserId: withUserId)
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { _ in status = "הבקשה נשלחה" }
            .store(in: &bag)
    }
}
