import SwiftUI
import Combine

final class MyOrdersViewModel: ObservableObject {
    @Published var orders: [Order] = []
    @Published var loading = true
    private var bag = Set<AnyCancellable>()

    func load() {
        loading = true
        GetTodayOrders().execute().receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { self.orders = $0 }
            .store(in: &bag)
    }
}

struct MyOrdersView: View {
    @StateObject private var vm = MyOrdersViewModel()

    var body: some View {
        NavigationStack {
            List(vm.orders) { o in
                VStack(alignment: .leading) {
                    Text(o.customerName).font(.headline)
                    Text(String(format: "₪%.0f", o.totalAmount)).font(.subheadline)
                    Text(o.status.rawValue).font(.caption).foregroundColor(.blue)
                }
            }
            .overlay { if vm.loading { ProgressView() } }
            .navigationTitle("customer.my_orders".localized)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: NewOrderView()) { Image(systemName: "plus.circle.fill") }
                }
                ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } }
            }
            .onAppear { vm.load() }
            .rtl()
        }
    }
}
