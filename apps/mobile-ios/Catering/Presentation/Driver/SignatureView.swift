import SwiftUI
import UIKit
import Combine

struct SignatureView: View {
    let deliveryId: String
    @State private var paths: [Path] = []
    @State private var currentPath = Path()
    @State private var saving = false
    @State private var status: String?
    @Environment(\.dismiss) var dismiss
    @State private var bag = Set<AnyCancellable>()

    var body: some View {
        VStack {
            Text("driver.signature".localized).font(.title2.bold())
            ZStack {
                Color.white
                ForEach(0..<paths.count, id: \.self) { i in
                    paths[i].stroke(Color.black, lineWidth: 2.5)
                }
                currentPath.stroke(Color.black, lineWidth: 2.5)
            }
            .frame(height: 300)
            .border(Color.gray, width: 1)
            .gesture(DragGesture(minimumDistance: 0)
                .onChanged { value in
                    if currentPath.isEmpty { currentPath.move(to: value.location) }
                    else { currentPath.addLine(to: value.location) }
                }
                .onEnded { _ in
                    paths.append(currentPath)
                    currentPath = Path()
                }
            )
            HStack {
                Button("נקה") { paths.removeAll(); currentPath = Path() }
                Spacer()
                Button("shared.save".localized) { save() }.disabled(paths.isEmpty || saving)
            }
            .padding()
            if let s = status { Text(s).foregroundColor(.green) }
            Spacer()
        }
        .padding()
        .rtl()
    }

    private func save() {
        saving = true
        let renderer = ImageRenderer(content:
            ZStack {
                Color.white
                ForEach(0..<paths.count, id: \.self) { i in
                    paths[i].stroke(Color.black, lineWidth: 2.5)
                }
            }
            .frame(width: 600, height: 300)
        )
        renderer.scale = UIScreen.main.scale
        guard let uiImage = renderer.uiImage, let png = uiImage.pngData() else { saving = false; return }

        CaptureSignature().execute(deliveryId: deliveryId, pngData: png)
            .receive(on: DispatchQueue.main)
            .sink { _ in saving = false } receiveValue: { _ in
                status = "נשמר"
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { dismiss() }
            }
            .store(in: &bag)
    }
}

extension Path {
    var isEmpty: Bool { boundingRect.isEmpty || boundingRect.isNull }
}

// BezierPath-based renderer for higher fidelity export
final class SignatureBezierExporter {
    static func render(paths: [Path], size: CGSize) -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            UIColor.black.setStroke()
            for swiftPath in paths {
                let bezier = UIBezierPath(cgPath: swiftPath.cgPath)
                bezier.lineWidth = 2.5
                bezier.lineCapStyle = .round
                bezier.stroke()
            }
        }
    }
}
