import WidgetKit
import SwiftUI

struct MessagesWidget: Widget {
    let kind = "MessagesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MessagesProvider()) { entry in
            MessagesWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Messages")
        .description("Unread messages and service requests from BC Self-Serve.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MessagesWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MessagesEntry

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        default:
            smallView
        }
    }

    // MARK: - Small

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.bcBlue)
                Text("Messages")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(entry.unreadCount)")
                    .font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(entry.unreadCount > 0 ? Color.bcBlue : .secondary)
                Text("msgs")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if entry.hasNotifications {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.bcAccent)
                        .frame(width: 6, height: 6)
                    Text("New notification")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Medium

    private var mediumView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(Color.bcBlue)
                    Text("Messages")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(entry.date, style: .time)
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                countItem("Messages", entry.unreadCount, icon: "envelope.fill")
                countItem("Requests", entry.requestCount, icon: "doc.text.fill")

                if entry.hasNotifications {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.bcAccent)
                            .frame(width: 6, height: 6)
                        Text("You have a new notification")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()
            }

            Spacer()

            VStack(spacing: 4) {
                let total = entry.unreadCount + entry.requestCount
                Text("\(total)")
                    .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(total > 0 ? Color.bcBlue : .secondary)
                Text("total items")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 90)
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Helpers

    private func countItem(_ label: String, _ count: Int, icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(Color.bcBlue)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("\(count)")
                .font(.caption.bold().monospacedDigit())
        }
    }
}

// MARK: - Color Extension

extension Color {
    static let bcBlue = Color(red: 26/255, green: 90/255, blue: 150/255)
    static let bcAccent = Color(red: 78/255, green: 156/255, blue: 215/255)
}
