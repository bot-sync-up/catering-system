import SwiftUI
import Combine

final class CrmViewModel: ObservableObject {
    @Published var leads: [Lead] = []
    @Published var loading = true
    private var bag = Set<AnyCancellable>()
    private let repo = LeadRepositoryImpl()

    func load() {
        loading = true
        repo.list().receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { self.leads = $0 }
            .store(in: &bag)
    }
}

struct CrmView: View {
    @StateObject private var vm = CrmViewModel()
    var body: some View {
        NavigationStack {
            List(vm.leads) { lead in
                NavigationLink(destination: LeadDetailView(lead: lead)) {
                    VStack(alignment: .leading) {
                        Text(lead.name).font(.headline)
                        Text(lead.phone).font(.subheadline).foregroundColor(.secondary)
                        Text(stageLabel(lead.stage)).font(.caption).foregroundColor(.blue)
                    }
                }
            }
            .overlay { if vm.loading { ProgressView() } }
            .navigationTitle("role.agent".localized)
            .toolbar { ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } } }
            .onAppear { vm.load() }
            .rtl()
        }
    }

    private func stageLabel(_ s: LeadStage) -> String {
        switch s {
        case .new: return "ליד חדש"
        case .contacted: return "נוצר קשר"
        case .quoteSent: return "הצעה נשלחה"
        case .won: return "נסגר"
        case .lost: return "אבד"
        }
    }
}
