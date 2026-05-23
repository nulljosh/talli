import SwiftUI

struct MenuBarView: View {
    @Environment(MacAppState.self) private var appState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if appState.isAuthenticated {
                Text("Next Payment")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(appState.paymentAmountText)
                    .font(.headline)

                Text("\(appState.nextPaymentDateText) · \(appState.countdownText)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Divider()

                if !appState.statusMessages.isEmpty {
                    Text("\(appState.statusMessages.count) message\(appState.statusMessages.count == 1 ? "" : "s")")
                        .font(.caption)
                }

                Button("Refresh") {
                    Task { await appState.refresh() }
                }
            } else {
                Text("Not signed in")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            Button("Quit Tally") {
                NSApplication.shared.terminate(nil)
            }
            .keyboardShortcut("q")
        }
        .padding(8)
    }
}
