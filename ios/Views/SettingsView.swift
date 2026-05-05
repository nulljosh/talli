import SwiftUI
import UIKit

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var isGeneratingAvatar = false

    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    avatarButton
                    VStack(alignment: .leading, spacing: 2) {
                        Text(appState.username ?? "—")
                            .font(.body.weight(.semibold))
                        Text("BC Self-Serve")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section {
                HStack {
                    Text("Account")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(appState.username ?? "—")
                        .foregroundStyle(.primary)
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await appState.logout() }
                } label: {
                    Text("Log Out")
                }
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            if appState.avatarImageData == nil {
                Task { await generateAvatar() }
            }
        }
    }

    private var avatarButton: some View {
        Button {
            guard !isGeneratingAvatar else { return }
            Task { await generateAvatar() }
        } label: {
            ZStack {
                if let data = appState.avatarImageData, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 56, height: 56)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color.accentColor.opacity(0.15))
                        .frame(width: 56, height: 56)
                    Text(avatarInitial)
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                }
                if isGeneratingAvatar {
                    Circle()
                        .fill(.black.opacity(0.4))
                        .frame(width: 56, height: 56)
                    ProgressView().tint(.white)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var avatarInitial: String {
        guard let u = appState.username, let first = u.first else { return "?" }
        return String(first).uppercased()
    }

    @MainActor
    private func generateAvatar() async {
        isGeneratingAvatar = true
        defer { isGeneratingAvatar = false }
        let image = Self.generateNodeGraphImage()
        guard let data = image.jpegData(compressionQuality: 0.9) else { return }
        appState.saveAvatarData(data)
    }

    private static func generateNodeGraphImage() -> UIImage {
        let palettes: [UIColor] = [
            UIColor(red: 0.10, green: 0.35, blue: 0.59, alpha: 1), // BC blue
            UIColor(red: 0.14, green: 0.45, blue: 0.70, alpha: 1),
            UIColor(red: 0.31, green: 0.61, blue: 0.84, alpha: 1),
            UIColor(red: 0.36, green: 0.56, blue: 0.79, alpha: 1),
            UIColor(red: 0.48, green: 0.67, blue: 0.84, alpha: 1),
        ]
        let nodeColor = palettes.randomElement()!
        let size: CGFloat = 200
        let cx: CGFloat = 100, cy: CGFloat = 100

        typealias Offsets = [(CGFloat, CGFloat)]
        typealias Edges = [(Int, Int)]
        let topologies: [(Offsets, Edges)] = [
            (
                [(0,-58),(46,-30),(55,18),(20,56),(-20,56),(-55,18),(-46,-30),(0,0)],
                [(7,0),(7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0)]
            ),
            (
                [(0,-55),(48,-27),(48,27),(0,55),(-48,27),(-48,-27),(0,-22),(22,11),(-22,11)],
                [(0,1),(1,2),(2,3),(3,4),(4,5),(5,0),(6,7),(7,8),(8,6),(0,6),(2,7),(4,8),(1,6),(3,7),(5,8)]
            ),
            (
                [(-38,-50),(18,-52),(52,-10),(44,42),(0,55),(-44,34),(-54,-10),(0,-10),(30,12),(-25,18)],
                [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0),(0,7),(1,7),(2,8),(3,8),(4,9),(5,9),(6,9),(7,8),(8,9),(7,9)]
            ),
        ]

        let (baseOffsets, allEdges) = topologies.randomElement()!
        let jitter: CGFloat = CGFloat.random(in: 10...20)
        let nodes = baseOffsets.map { dx, dy in
            CGPoint(
                x: cx + dx + CGFloat.random(in: -jitter...jitter),
                y: cy + dy + CGFloat.random(in: -jitter...jitter)
            )
        }
        let edgeDensity = Double.random(in: 0.45...0.85)
        let activeEdges = allEdges.filter { _ in Double.random(in: 0...1) < edgeDensity }

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        return renderer.image { ctx in
            let cgCtx = ctx.cgContext
            UIColor(red: 0.06, green: 0.09, blue: 0.14, alpha: 1).setFill()
            UIBezierPath(ovalIn: CGRect(x: 0, y: 0, width: size, height: size)).fill()

            cgCtx.setStrokeColor(UIColor(white: 1, alpha: 0.2).cgColor)
            cgCtx.setLineWidth(1.5)
            cgCtx.setLineCap(.round)
            for (a, b) in activeEdges where a < nodes.count && b < nodes.count {
                cgCtx.move(to: nodes[a])
                cgCtx.addLine(to: nodes[b])
            }
            cgCtx.strokePath()

            nodeColor.setFill()
            for (i, node) in nodes.enumerated() {
                let r = CGFloat.random(in: 5...11)
                UIBezierPath(ovalIn: CGRect(x: node.x - r, y: node.y - r, width: r*2, height: r*2)).fill()
                if i == 0 || i == nodes.count / 2 {
                    UIColor(white: 1, alpha: 0.35).setFill()
                    let dot: CGFloat = 3
                    UIBezierPath(ovalIn: CGRect(x: node.x - dot, y: node.y - dot, width: dot*2, height: dot*2)).fill()
                    nodeColor.setFill()
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppState())
    }
}
