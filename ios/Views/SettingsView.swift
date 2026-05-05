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
        let image = Self.generatePixelArtImage()
        guard let data = image.pngData() else { return }
        appState.saveAvatarData(data)
    }

    // Pixel-art avatar: 8x8 mirrored grid, matches web generatePixelArtSVG() exactly
    private static func generatePixelArtImage() -> UIImage {
        let palettes: [[UIColor]] = [
            [UIColor(hex: "e63946"), UIColor(hex: "457b9d"), UIColor(hex: "1d3557")],
            [UIColor(hex: "7b2d8b"), UIColor(hex: "c77dff"), UIColor(hex: "e0aaff")],
            [UIColor(hex: "0077b6"), UIColor(hex: "00b4d8"), UIColor(hex: "90e0ef")],
            [UIColor(hex: "d62828"), UIColor(hex: "f77f00"), UIColor(hex: "fcbf49")],
            [UIColor(hex: "2d6a4f"), UIColor(hex: "52b788"), UIColor(hex: "b7e4c7")],
            [UIColor(hex: "FF851B"), UIColor(hex: "f2ede8"), UIColor(hex: "1a1612")],
        ]
        let bgs: [UIColor] = [
            UIColor(hex: "111111"), UIColor(hex: "0d0c0b"), UIColor(hex: "1a1a1a"),
            UIColor(hex: "0f0f1a"), UIColor(hex: "0a1a0a"), UIColor(hex: "0d0c0b"),
        ]
        let palette = palettes.randomElement()!
        let bg      = bgs.randomElement()!
        let gridSize = 8
        let px = 8
        let total = gridSize * px   // 64pt canvas

        // Build half-grid (8 rows x 4 cols), mirrored left-to-right
        var half = [[Int]]()
        for _ in 0..<gridSize {
            var row = [Int]()
            for _ in 0..<(gridSize / 2) {
                row.append(Double.random(in: 0...1) > 0.45 ? Int.random(in: 0...2) : -1)
            }
            half.append(row)
        }

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: total, height: total))
        return renderer.image { ctx in
            bg.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: total, height: total))
            for row in 0..<gridSize {
                for col in 0..<gridSize {
                    let halfCol = col < gridSize / 2 ? col : gridSize - 1 - col
                    let ci = half[row][halfCol]
                    guard ci >= 0 else { continue }
                    palette[ci].setFill()
                    ctx.fill(CGRect(x: col * px, y: row * px, width: px, height: px))
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
