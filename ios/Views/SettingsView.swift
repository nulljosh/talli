import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @AppStorage("app_theme") private var rawTheme = "system"
    @State private var isGeneratingAvatar = false

    var body: some View {
        List {
            Section("Appearance") {
                AppearancePicker(rawTheme: $rawTheme)
                    .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
            }

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
    }

    private var avatarButton: some View {
        VStack(spacing: 6) {
            Button {
                guard !isGeneratingAvatar else { return }
                isGeneratingAvatar = true
                Task { @MainActor in
                    await Task.yield()
                    appState.regenerateAvatar()
                    isGeneratingAvatar = false
                }
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
            Text("Tap to regenerate")
                .font(.caption2)
                .foregroundStyle(.secondary)
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

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppState())
    }
}
