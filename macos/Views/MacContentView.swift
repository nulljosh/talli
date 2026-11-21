import SwiftUI

@MainActor
struct MacContentView: View {
    @EnvironmentObject private var appState: MacAppState

    var body: some View {
        Group {
            if appState.isAuthenticated {
                AuthenticatedShell()
            } else {
                MacLoginView()
            }
        }
    }
}

@MainActor
private struct AuthenticatedShell: View {
    @EnvironmentObject private var appState: MacAppState

    var body: some View {
        // A floating glass nav bar, the same four tabs as the web and iPhone. Cmd-1 to 4 switch.
        NavigationStack {
            detailView
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .safeAreaInset(edge: .bottom) { navBar }
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    Task { await appState.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(appState.isLoading)
                .help("Refresh dashboard")
            }
        }
        .overlay(alignment: .top) {
            if let error = appState.errorMessage {
                ErrorBanner(message: error) {
                    appState.errorMessage = nil
                }
                .padding(.top, 8)
            }
        }
    }

    private var navBar: some View {
        HStack(spacing: 4) {
            ForEach(Array(MacAppState.AppSection.allCases.enumerated()), id: \.element) { i, section in
                let on = appState.selectedSection == section
                Button { appState.selectedSection = section } label: {
                    Label(LocalizedStringKey(section.rawValue), systemImage: section.icon)
                        .font(.body.weight(on ? .semibold : .regular))
                        .foregroundStyle(on ? Color.bcPrimary : .secondary)
                        .padding(.horizontal, 16)
                        .frame(height: 40)
                        .background(on ? Color.bcPrimary.opacity(0.12) : .clear, in: Capsule())
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(KeyEquivalent(Character(String(i + 1))), modifiers: .command)
            }
        }
        .padding(4)
        .liquidGlass(in: Capsule())
        .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
        .padding(.bottom, 16)
    }

    @ViewBuilder
    private var detailView: some View {
        switch appState.selectedSection {
        case .dashboard:
            MacDashboardView()
        case .benefits:
            MacBenefitsView()
        case .messages:
            MacMessagesView()
        case .settings:
            MacSettingsView()
        }
    }
}

@MainActor
private struct ErrorBanner: View {
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message)
                .font(.caption)
                .lineLimit(2)
            Spacer(minLength: 8)
            Button("Dismiss", action: onDismiss)
                .font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .liquidGlass(in: Capsule(), fallback: .ultraThinMaterial)
        .padding(.horizontal)
        .shadow(radius: 8, y: 2)
    }
}
