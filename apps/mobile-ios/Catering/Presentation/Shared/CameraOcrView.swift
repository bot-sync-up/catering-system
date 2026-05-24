import SwiftUI
import Combine

struct CameraOcrView: View {
    @State private var image: UIImage?
    @State private var pickerOn = false
    @State private var result: InvoiceOcrResult?
    @State private var loading = false
    @State private var bag = Set<AnyCancellable>()

    var body: some View {
        VStack(spacing: 16) {
            if let img = image {
                Image(uiImage: img).resizable().scaledToFit().frame(maxHeight: 250)
            }
            Button("shared.scan_invoice".localized) { pickerOn = true }
                .buttonStyle(.borderedProminent)
            if loading { ProgressView() }
            if let r = result {
                Form {
                    if let v = r.vendor { LabeledContent("ספק", value: v) }
                    if let n = r.invoiceNumber { LabeledContent("מס' חשבונית", value: n) }
                    if let t = r.totalAmount { LabeledContent("סך הכל", value: String(format: "₪%.2f", t)) }
                }
                .frame(maxHeight: 200)
            }
            Spacer()
        }
        .padding()
        .sheet(isPresented: $pickerOn) {
            CameraView(image: $image, onDismiss: runOcr)
        }
        .navigationTitle("shared.scan_invoice".localized)
        .rtl()
    }

    private func runOcr() {
        guard let img = image else { return }
        loading = true
        ScanInvoiceOcr().execute(image: img).receive(on: DispatchQueue.main)
            .sink { _ in loading = false } receiveValue: { result = $0 }
            .store(in: &bag)
    }
}
