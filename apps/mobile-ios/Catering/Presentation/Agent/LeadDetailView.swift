import SwiftUI

struct LeadDetailView: View {
    let lead: Lead
    var body: some View {
        Form {
            Section("פרטי ליד") {
                LabeledContent("שם", value: lead.name)
                LabeledContent("טלפון", value: lead.phone)
                if let e = lead.email { LabeledContent("דוא\"ל", value: e) }
                if let v = lead.estimatedValue { LabeledContent("שווי משוער", value: String(format: "₪%.0f", v)) }
            }
            if let n = lead.notes {
                Section("הערות") { Text(n) }
            }
            Section {
                Button("התקשר") {
                    if let url = URL(string: "tel://\(lead.phone)") { UIApplication.shared.open(url) }
                }
                Button("שלח WhatsApp") {
                    if let url = URL(string: "https://wa.me/\(lead.phone)") { UIApplication.shared.open(url) }
                }
            }
        }
        .navigationTitle(lead.name)
        .rtl()
    }
}
