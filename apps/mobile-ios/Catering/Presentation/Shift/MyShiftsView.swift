import SwiftUI
import Combine

final class MyShiftsViewModel: ObservableObject {
    @Published var shifts: [ShiftRecord] = []
    @Published var loading = true
    private var bag = Set<AnyCancellable>()
    private let repo = ShiftRepositoryImpl()
    func load() {
        loading = true
        repo.myShifts().receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { self.shifts = $0 }
            .store(in: &bag)
    }
}

struct MyShiftsView: View {
    @StateObject private var vm = MyShiftsViewModel()
    var body: some View {
        List(vm.shifts) { shift in
            VStack(alignment: .leading) {
                Text(shift.startAt.formatted(.dateTime.day().month().year())).font(.headline)
                let from = shift.startAt.formatted(.dateTime.hour().minute())
                let to = shift.endAt?.formatted(.dateTime.hour().minute()) ?? "—"
                Text("\(from) - \(to)").foregroundColor(.secondary)
                NavigationLink("shift.request_swap".localized, destination: RequestSwapView(shift: shift)).font(.caption)
            }
        }
        .overlay { if vm.loading { ProgressView() } }
        .navigationTitle("shift.my_shifts".localized)
        .onAppear { vm.load() }
        .rtl()
    }
}
