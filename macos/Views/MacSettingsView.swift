import SwiftUI

struct MacSettingsView: View {
    @AppStorage("app_theme") private var rawTheme = "system"
    @Environment(MacAppState.self) private var appState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Account")
                    .font(.headline)
                AccountCard(username: appState.username) {
                    Task { await appState.logout() }
                }
                .modifier(MacGlassCard())

                Text("Appearance")
                    .font(.headline)
                AppearancePicker(rawTheme: $rawTheme)
                    .modifier(MacGlassCard())
            }
            .padding(24)
        }
        .navigationTitle("Settings")
    }
}

private struct AccountCard: View {
    let username: String
    let signOut: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Signed in as")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(username.isEmpty ? "Unknown" : username)
                    .font(.body.weight(.medium))
            }
            Spacer()
            Button("Sign Out", action: signOut)
                .buttonStyle(.bordered)
        }
    }
}

private struct AppearancePicker: View {
    @Binding var rawTheme: String
    private let options = [("light", "Light"), ("dark", "Dark"), ("system", "System")]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.0) { id, label in
                Button { rawTheme = id } label: {
                    VStack(spacing: 8) {
                        themePreview(id)
                            .frame(height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(rawTheme == id ? Color.accentColor : Color.primary.opacity(0.12), lineWidth: 2)
                            )
                        Text(label)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(rawTheme == id ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(.secondary))
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder
    private func themePreview(_ id: String) -> some View {
        switch id {
        case "light":
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color(white: 0.92))
        case "dark":
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color(white: 0.12))
        default:
            GeometryReader { geo in
                ZStack {
                    Color(white: 0.92)
                    Path { p in
                        p.move(to: CGPoint(x: geo.size.width, y: 0))
                        p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                        p.addLine(to: CGPoint(x: 0, y: geo.size.height))
                        p.closeSubpath()
                    }.fill(Color(white: 0.12))
                }
            }
        }
    }
}
