import SwiftUI
import Combine

final class PrepTasksViewModel: ObservableObject {
    @Published var tasks: [TaskItem] = []
    @Published var loading = true
    private var bag = Set<AnyCancellable>()
    private let repo = TaskRepositoryImpl()

    func load() {
        loading = true
        repo.fetch(assignee: nil).receive(on: DispatchQueue.main)
            .sink { _ in self.loading = false } receiveValue: { self.tasks = $0 }
            .store(in: &bag)
    }
}

struct PrepTasksView: View {
    @StateObject private var vm = PrepTasksViewModel()
    var body: some View {
        NavigationStack {
            List(vm.tasks) { task in
                NavigationLink(destination: MarkDoneView(task: task)) {
                    VStack(alignment: .leading) {
                        Text(task.title).font(.headline)
                        Text(task.dueAt.formatted(.dateTime.locale(Locale(identifier: "he_IL"))))
                            .font(.caption).foregroundColor(.secondary)
                        Text(task.status.rawValue).font(.caption).foregroundColor(.orange)
                    }
                }
            }
            .overlay { if vm.loading { ProgressView() } }
            .navigationTitle("kitchen.prep_tasks".localized)
            .toolbar { ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } } }
            .onAppear { vm.load() }
            .rtl()
        }
    }
}
