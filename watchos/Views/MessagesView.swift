import SwiftUI

struct MessagesView: View {
    @State private var messages: [TallyMessage] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("MESSAGES")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if messages.isEmpty {
                    Text("No messages")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 16)
                } else {
                    ForEach(messages) { message in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(message.text)
                                .font(.caption2.bold())
                                .lineLimit(2)

                            Text(formatDate(message.timestamp))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        if message.id != messages.last?.id {
                            Divider()
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .task {
            await loadData()
        }
    }

    private func loadData() async {
        if let cached = WatchAPI.shared.cachedSummary() {
            messages = cached.messages
            isLoading = false
        }
        let token = WatchAPI.shared.apiToken
        guard !token.isEmpty else {
            isLoading = false
            return
        }
        do {
            let summary = try await WatchAPI.shared.fetchSummary(token: token)
            messages = summary.messages
        } catch {
            // Keep cached data on failure
        }
        isLoading = false
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else { return dateString }
        let display = DateFormatter()
        display.dateFormat = "MMM d, yyyy"
        return display.string(from: date)
    }
}
