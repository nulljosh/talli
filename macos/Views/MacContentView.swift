import SwiftUI

struct MacContentView: View {
    @Environment(MacAppState.self) private var appState

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

private struct AuthenticatedShell: View {
    @Environment(MacAppState.self) private var appState

    var body: some View {
        @Bindable var state = appState

        NavigationSplitView {
            List(MacAppState.AppSection.allCases, selection: Binding(
                get: { appState.selectedSection },
                set: { appState.selectedSection = $0 }
            )) { section in
                Label(section.rawValue, systemImage: section.icon)
                    .tag(section)
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
        } detail: {
            detailView
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .navigationTitle(appState.selectedSection.rawValue)
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

    @ViewBuilder
    private var detailView: some View {
        switch appState.selectedSection {
        case .dashboard:
            MacDashboardView()
        case .benefits:
            MacBenefitsView()
        case .messages:
            MacMessagesView()
        }
    }
}

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
        .background(.ultraThinMaterial, in: Capsule())
        .padding(.horizontal)
        .shadow(radius: 8, y: 2)
    }
}
