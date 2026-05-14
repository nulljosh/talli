import SwiftUI

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
    }

    private var avatarButton: some View {
        VStack(spacing: 6) {
            Button {
                guard !isGeneratingAvatar else { return }
                isGeneratingAvatar = true
                appState.regenerateAvatar()
                isGeneratingAvatar = false
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

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppState())
    }
}
