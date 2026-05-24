import SwiftUI
import Combine
import CoreLocation

final class ClockViewModel: ObservableObject {
    @Published var activeShiftId: String?
    @Published var status: String = "מחוץ למשמרת"
    @Published var submitting = false
    private var bag = Set<AnyCancellable>()

    func clockIn() {
        submitting = true
        let loc = GeofencingManager.shared.lastLocation.map { GeoPoint(lat: $0.coordinate.latitude, lng: $0.coordinate.longitude) }
        ClockIn().execute(at: loc).receive(on: DispatchQueue.main)
            .sink { _ in self.submitting = false } receiveValue: { record in
                self.activeShiftId = record.id
                self.status = "במשמרת מאז \(record.startAt.formatted(.dateTime.hour().minute()))"
            }.store(in: &bag)
    }

    func clockOut() {
        guard let id = activeShiftId else { return }
        submitting = true
        let loc = GeofencingManager.shared.lastLocation.map { GeoPoint(lat: $0.coordinate.latitude, lng: $0.coordinate.longitude) }
        ClockOut().execute(shiftId: id, at: loc).receive(on: DispatchQueue.main)
            .sink { _ in self.submitting = false } receiveValue: { _ in
                self.activeShiftId = nil
                self.status = "מחוץ למשמרת"
            }.store(in: &bag)
    }
}

struct ClockView: View {
    @StateObject private var vm = ClockViewModel()
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "clock.fill").font(.system(size: 80)).foregroundColor(.blue)
                Text(vm.status).font(.title3)
                if vm.activeShiftId == nil {
                    Button(action: vm.clockIn) {
                        Text("shift.clock_in".localized).frame(maxWidth: .infinity).padding()
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Button(action: vm.clockOut) {
                        Text("shift.clock_out".localized).frame(maxWidth: .infinity).padding()
                    }
                    .buttonStyle(.bordered).tint(.red)
                }
                NavigationLink("shift.my_shifts".localized, destination: MyShiftsView())
                Spacer()
            }
            .padding()
            .navigationTitle("role.shift".localized)
            .toolbar { ToolbarItem(placement: .topBarLeading) { NavigationLink(destination: SettingsView()) { Image(systemName: "gear") } } }
            .onAppear { GeofencingManager.shared.requestAuthorization(); GeofencingManager.shared.startUpdates() }
            .rtl()
        }
    }
}
