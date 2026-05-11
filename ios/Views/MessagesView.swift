import SwiftUI

struct MessagesView: View {
    @Environment(AppState.self) private var appState
    @State private var expanded: String? = nil

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                let items = appState.statusMessageItems
                if items.isEmpty {
                    Text("No messages")
                        .foregroundStyle(.secondary)
                        .padding(32)
                } else {
                    ForEach(Array(items.enumerated()), id: \.element.id) { i, message in
                        MessageRow(
                            message: message,
                            isRead: appState.readMessageIds.contains(message.id),
                            isExpanded: expanded == message.id
                        ) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expanded = (expanded == message.id) ? nil : message.id
                            }
                            if !appState.readMessageIds.contains(message.id) {
                                Task { await appState.markMessageRead(message.id) }
                            }
                        }
                        if i < items.count - 1 {
                            Divider()
                                .padding(.leading, 70)
                        }
                    }
                }
            }
        }
        .navigationTitle("Messages")
        .refreshable {
            await appState.refreshDashboard()
        }
    }
}

private struct MessageRow: View {
    let message: DashboardData.StatusMessage
    let isRead: Bool
    let isExpanded: Bool
    let onTap: () -> Void

    private var initials: String {
        let words = message.text.split(separator: " ")
        if words.count >= 2 {
            return String(words[0].prefix(1) + words[1].prefix(1)).uppercased()
        }
        return String(message.text.prefix(2)).uppercased()
    }

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                ZStack(alignment: .topTrailing) {
                    Circle()
                        .fill(isRead ? Color(.tertiarySystemFill) : Color.tallyOrange)
                        .frame(width: 38, height: 38)
                    Text(initials)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(isRead ? Color.secondary : Color.white)
                    if !isRead {
                        Circle()
                            .fill(Color.primary)
                            .frame(width: 8, height: 8)
                            .offset(x: 2, y: -2)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(message.text)
                            .font(.system(size: 14, weight: isRead ? .regular : .semibold))
                            .foregroundStyle(Color.primary)
                            .lineLimit(isExpanded ? nil : 2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        if let ts = message.timestamp {
                            Text(ts)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .background(isExpanded ? Color(.secondarySystemGroupedBackground) : Color.clear)
    }
}

#Preview {
    NavigationStack {
        MessagesView()
            .environment(AppState())
    }
}
