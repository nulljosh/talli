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
                AvatarView(size: 56)
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

    @MainActor
    private func generateAvatar() async {
        isGeneratingAvatar = true
        defer { isGeneratingAvatar = false }
        let image = Self.generateNodeGraphImage()
        guard let data = image.pngData() else { return }
        appState.saveAvatarData(data)
    }

    // Node-graph avatar: random dots connected by proximity lines, Anthropic aesthetic
    private static func generateNodeGraphImage() -> UIImage {
        let size: CGFloat = 64
        let count = 18 + Int.random(in: 0...4)

        struct Node {
            var x, y, r: CGFloat
            var hub: Bool
            var accent: Bool
        }

        let nodes: [Node] = (0..<count).map { _ in
            Node(
                x: 4 + CGFloat.random(in: 0...56),
                y: 4 + CGFloat.random(in: 0...56),
                r: 1 + CGFloat.random(in: 0...1.5),
                hub: Double.random(in: 0...1) < 0.15,
                accent: Double.random(in: 0...1) < 0.3
            )
        }

        let orange = UIColor(hex: "FF851B")
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        return renderer.image { _ in
            let ctx = UIGraphicsGetCurrentContext()!
            UIColor(hex: "0d0c0b").setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

            ctx.setLineWidth(0.5)
            ctx.setLineCap(.round)
            for i in 0..<nodes.count {
                for j in (i+1)..<nodes.count {
                    let dx = nodes[i].x - nodes[j].x
                    let dy = nodes[i].y - nodes[j].y
                    let dist = sqrt(dx*dx + dy*dy)
                    if dist < 22 {
                        let alpha = (1 - dist / 22) * 0.45
                        ctx.setStrokeColor(orange.withAlphaComponent(alpha).cgColor)
                        ctx.move(to: CGPoint(x: nodes[i].x, y: nodes[i].y))
                        ctx.addLine(to: CGPoint(x: nodes[j].x, y: nodes[j].y))
                        ctx.strokePath()
                    }
                }
            }

            for n in nodes {
                if n.hub {
                    ctx.setLineWidth(0.75)
                    ctx.setStrokeColor(orange.withAlphaComponent(0.15).cgColor)
                    let ringR = n.r + 4
                    ctx.addEllipse(in: CGRect(x: n.x - ringR, y: n.y - ringR, width: ringR * 2, height: ringR * 2))
                    ctx.strokePath()
                }
                let fill: UIColor = n.accent ? orange : UIColor.white.withAlphaComponent(0.65)
                fill.setFill()
                ctx.fillEllipse(in: CGRect(x: n.x - n.r, y: n.y - n.r, width: n.r * 2, height: n.r * 2))
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
