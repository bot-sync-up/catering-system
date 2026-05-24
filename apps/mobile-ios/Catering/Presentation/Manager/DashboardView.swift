import SwiftUI
import Combine

final class DashboardViewModel: ObservableObject {
    @Published var ordersToday: Int = 0
    @Published var revenueWeek: Double = 0
    @Published var staffOnShift: Int = 0
    @Published var loading = true
    private var bag = Set<AnyCancellable>()

    func load() {
        loading = true
        GetTodayOrders().execute()
            .receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { orders in
                self.ordersToday = orders.count
                self.revenueWeek = orders.reduce(0) { $0 + $1.totalAmount }
            }.store(in: &bag)
    }
}

struct DashboardView: View {
    @StateObject private var vm = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    StatCard(title: "manager.orders_today".localized, value: "\(vm.ordersToday)", icon: "bag.fill")
                    StatCard(title: "manager.revenue_week".localized, value: String(format: "₪%.0f", vm.revenueWeek), icon: "shekelsign.circle.fill")
                    StatCard(title: "manager.staff_on_shift".localized, value: "\(vm.staffOnShift)", icon: "person.3.fill")
                }
                .padding()
            }
            .navigationTitle("manager.dashboard".localized)
            .toolbar { ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } } }
            .onAppear { vm.load() }
            .rtl()
        }
    }
}

struct StatCard: View {
    let title: String; let value: String; let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon).font(.title).foregroundColor(.orange)
            Text(value).font(.title.bold())
            Text(title).font(.footnote).foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}
