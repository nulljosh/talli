import SwiftUI

struct MacMessagesView: View {
    @Environment(MacAppState.self) private var appState

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if appState.statusMessages.isEmpty {
                    emptyState
                } else {
                    ForEach(appState.statusMessages) { message in
                        messageRow(message)
                    }
                }
            }
            .padding(24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func messageRow(_ message: MacDashboardData.StatusMessage) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(message.text)
                .font(.body)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let ts = message.timestamp, let date = MacDateParsing.parse(ts) {
                Text(date.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
        )
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "envelope.open")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No messages")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }
}
