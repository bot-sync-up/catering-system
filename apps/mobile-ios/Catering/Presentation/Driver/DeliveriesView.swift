import SwiftUI
import Combine

final class DeliveriesViewModel: ObservableObject {
    @Published var deliveries: [Delivery] = []
    @Published var loading = true
    private var bag = Set<AnyCancellable>()
    private let repo = DeliveryRepositoryImpl()
    func load() {
        loading = true
        repo.myDeliveries().receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { self.deliveries = $0 }
            .store(in: &bag)
    }
}

struct DeliveriesView: View {
    @StateObject private var vm = DeliveriesViewModel()
    var body: some View {
        NavigationStack {
            List(vm.deliveries) { d in
                NavigationLink(destination: NavigateView(delivery: d)) {
                    VStack(alignment: .leading) {
                        Text("הזמנה \(d.orderId)").font(.headline)
                        Text("סטטוס: \(d.status.rawValue)").font(.caption).foregroundColor(.blue)
                        if let eta = d.etaMinutes { Text("עוד \(eta) דקות").font(.caption2) }
                    }
                }
            }
            .overlay { if vm.loading { ProgressView() } }
            .navigationTitle("driver.deliveries".localized)
            .toolbar { ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } } }
            .onAppear { vm.load(); GeofencingManager.shared.requestAuthorization() }
            .rtl()
        }
    }
}
