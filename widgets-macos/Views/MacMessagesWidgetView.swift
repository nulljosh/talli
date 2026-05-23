import WidgetKit
import SwiftUI

struct MacMessagesWidget: Widget {
    let kind = "MacMessagesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MacMessagesProvider()) { entry in
            MacMessagesWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Messages")
        .description("Unread messages and service requests from BC Self-Serve.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MacMessagesWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MacMessagesEntry

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
                    .foregroundStyle(Color.macBcBlue)
                Text("Messages")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(entry.unreadCount)")
                    .font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(entry.unreadCount > 0 ? Color.macBcBlue : .secondary)
                Text("msgs")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if entry.hasNotifications {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.macBcAccent)
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
                        .foregroundStyle(Color.macBcBlue)
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
                            .fill(Color.macBcAccent)
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
                    .foregroundStyle(total > 0 ? Color.macBcBlue : .secondary)
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
                .foregroundStyle(Color.macBcBlue)
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("\(count)")
                .font(.caption.bold().monospacedDigit())
        }
    }
}

// MARK: - Widget Color Palette

extension Color {
    /// #003366 - BC Gov primary
    static let macBcBlue = Color(red: 0/255, green: 51/255, blue: 102/255)
    /// #38B0DE - BC Gov accent
    static let macBcAccent = Color(red: 56/255, green: 176/255, blue: 222/255)
}
