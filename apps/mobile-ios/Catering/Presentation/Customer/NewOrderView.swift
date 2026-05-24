import SwiftUI

struct NewOrderView: View {
    @State private var customerName = ""
    @State private var address = ""
    @State private var notes = ""
    @State private var deliveryAt = Date()
    @State private var submitted = false

    var body: some View {
        Form {
            Section("פרטי לקוח") {
                TextField("שם", text: $customerName)
                TextField("כתובת", text: $address)
            }
            Section("מועד מסירה") {
                DatePicker("מועד", selection: $deliveryAt, displayedComponents: [.date, .hourAndMinute])
                    .environment(\.locale, Locale(identifier: "he_IL"))
            }
            Section("הערות") {
                TextField("הערות מיוחדות", text: $notes, axis: .vertical).lineLimit(3...6)
            }
            Section {
                Button("shared.confirm".localized) {
                    queueOrder()
                    submitted = true
                }
                .disabled(customerName.isEmpty || address.isEmpty)
                if submitted { Text("ההזמנה נשמרה (תסונכרן כשתחזור הרשת)").foregroundColor(.green) }
            }
        }
        .navigationTitle("customer.new_order".localized)
        .rtl()
    }

    private func queueOrder() {
        let payload: [String: Any] = [
            "customer_name": customerName,
            "address": address,
            "delivery_at": ISO8601DateFormatter().string(from: deliveryAt),
            "notes": notes
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            RealmManager.shared.queueOffline(endpoint: "/orders", method: "POST", payload: data)
            OfflineQueueSync.shared.syncNow()
        }
    }
}
