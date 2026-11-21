import SwiftUI

@MainActor
struct MacMessagesView: View {
    @EnvironmentObject private var appState: MacAppState

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if appState.statusMessages.isEmpty {
                    emptyState
                } else {
                    ForEach(appState.statusMessages) { message in
                        messageRow(message)
                    }
                }
            }
            .frame(maxWidth: 680)
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func messageRow(_ message: MacDashboardData.StatusMessage) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(message.text)
                .font(.system(size: 17))
                .frame(maxWidth: .infinity, alignment: .leading)

            if let ts = message.timestamp, let date = MacDateParsing.parse(ts) {
                Text(date.formatted(date: .abbreviated, time: .omitted))
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }

            ReplyDraftView(text: message.text) { try await MacAPIClient.shared.messageReply(text: $0) }
                .padding(.top, 4)
        }
        .macGlassCard()
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "envelope.open")
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(.secondary)
            Text("No messages")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }
}
