import Foundation
import CoreLocation
import Combine

final class GeofencingManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = GeofencingManager()

    @Published var lastLocation: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    let regionEnter = PassthroughSubject<String, Never>()
    let regionExit = PassthroughSubject<String, Never>()

    private let manager = CLLocationManager()

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.showsBackgroundLocationIndicator = true
    }

    func requestAuthorization() { manager.requestAlwaysAuthorization() }
    func startUpdates() { manager.startUpdatingLocation() }
    func stopUpdates() { manager.stopUpdatingLocation() }

    func addGeofence(id: String, lat: Double, lng: Double, radius: CLLocationDistance = 100) {
        let region = CLCircularRegion(center: CLLocationCoordinate2D(latitude: lat, longitude: lng), radius: radius, identifier: id)
        region.notifyOnEntry = true
        region.notifyOnExit = true
        manager.startMonitoring(for: region)
    }

    func removeGeofence(id: String) {
        for region in manager.monitoredRegions where region.identifier == id {
            manager.stopMonitoring(for: region)
        }
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        authorizationStatus = status
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        lastLocation = locations.last
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        regionEnter.send(region.identifier)
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        regionExit.send(region.identifier)
    }
}
