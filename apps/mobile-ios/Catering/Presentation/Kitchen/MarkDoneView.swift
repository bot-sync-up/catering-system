import SwiftUI
import Combine

struct MarkDoneView: View {
    let task: TaskItem
    @State private var note = ""
    @State private var submitting = false
    @State private var done = false
    @Environment(\.dismiss) var dismiss
    private var bag = Set<AnyCancellable>()

    var body: some View {
        Form {
            Section("משימה") {
                Text(task.title).font(.headline)
                Text("יעד: \(task.dueAt.formatted())")
            }
            Section("הערה") {
                TextField("פרט (אופציונלי)", text: $note, axis: .vertical).lineLimit(3...6)
            }
            Section {
                Button(action: submit) {
                    if submitting { ProgressView() }
                    else { Text("kitchen.mark_done".localized).frame(maxWidth: .infinity) }
                }
                .disabled(submitting)
            }
            if done {
                Section { Text("נשמר!").foregroundColor(.green) }
            }
        }
        .navigationTitle("kitchen.mark_done".localized)
        .rtl()
    }

    private func submit() {
        submitting = true
        var b = Set<AnyCancellable>()
        MarkTaskDone().execute(taskId: task.id, note: note.isEmpty ? nil : note)
            .receive(on: DispatchQueue.main)
            .sink { _ in submitting = false } receiveValue: { _ in
                done = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { dismiss() }
            }
            .store(in: &b)
    }
}
