import SwiftUI
import MapKit

struct NavigateView: View {
    let delivery: Delivery
    @State private var showProof = false
    @State private var showSignature = false
    @State private var proofImage: UIImage?

    var body: some View {
        VStack(spacing: 16) {
            Map().frame(height: 280).cornerRadius(12)
            Text("הזמנה: \(delivery.orderId)").font(.headline)
            Button("driver.navigate".localized) { openInMaps() }
                .buttonStyle(.borderedProminent)
            Button("driver.proof".localized) { showProof = true }
                .buttonStyle(.bordered)
            Button("driver.signature".localized) { showSignature = true }
                .buttonStyle(.bordered)
            Spacer()
        }
        .padding()
        .navigationTitle("driver.deliveries".localized)
        .sheet(isPresented: $showProof) {
            CameraView(image: $proofImage, onDismiss: uploadProof)
        }
        .sheet(isPresented: $showSignature) {
            SignatureView(deliveryId: delivery.orderId)
        }
        .rtl()
    }

    private func openInMaps() {
        let url = URL(string: "http://maps.apple.com/?daddr=\(0.0),\(0.0)&dirflg=d")!
        UIApplication.shared.open(url)
    }

    private func uploadProof() {
        guard let img = proofImage else { return }
        _ = UploadDeliveryProof().execute(deliveryId: delivery.orderId, image: img)
            .sink(receiveCompletion: { _ in }, receiveValue: { _ in })
    }
}
