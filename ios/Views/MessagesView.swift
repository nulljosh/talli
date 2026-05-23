import SwiftUI

struct MessagesView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if appState.statusMessageItems.isEmpty {
                    EmptyView()
                } else {
                    ForEach(appState.statusMessageItems) { message in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(message.text)
                                .font(.body)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            if let timestamp = formattedTimestamp(message.timestamp) {
                                Text(timestamp)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .glassCard()
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Messages")
        .refreshable {
            await appState.refreshDashboard()
        }
    }

    private func formattedTimestamp(_ raw: String?) -> String? {
        return raw
    }
}

#Preview {
    NavigationStack {
        MessagesView()
            .environment(AppState())
    }
}
