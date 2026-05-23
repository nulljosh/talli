import WidgetKit
import SwiftUI

struct MacPaymentWidget: Widget {
    let kind = "MacPaymentWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MacPaymentProvider()) { entry in
            MacPaymentWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Payment")
        .description("Countdown to your next payment.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct MacPaymentWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MacPaymentEntry

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        case .systemLarge:
            largeView
        default:
            smallView
        }
    }

    // MARK: - Small

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(Color.macBcBlue)
                Text("Payment")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(entry.amount)
                .font(.title2.bold().monospacedDigit())

            HStack(spacing: 4) {
                Text(entry.nextDate)
                    .font(.caption.bold())
                    .foregroundStyle(Color.macBcAccent)
                Text("(\(entry.daysUntil) days)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(Color.macBcBlue)
                    Text("Next Payment")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text(entry.amount)
                    .font(.title.bold().monospacedDigit())

                HStack(spacing: 4) {
                    Text(entry.nextDate)
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.macBcAccent)
                    Text("(\(entry.daysUntil) days)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            Spacer()

            VStack(spacing: 4) {
                Text("\(entry.daysUntil)")
                    .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(Color.macBcBlue)
                Text("days left")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 90)
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Large

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundStyle(Color.macBcBlue)
                Text("Next Payment")
                    .font(.headline)
                Spacer()
                Text(entry.date, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            VStack(alignment: .center, spacing: 8) {
                Text(entry.amount)
                    .font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())

                Text(entry.nextDate)
                    .font(.title3.bold())
                    .foregroundStyle(Color.macBcAccent)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text("\(entry.daysUntil) days remaining")
                        .font(.subheadline)
                }
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Spacer()

            progressBar

            Spacer()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    private var progressBar: some View {
        let total = 30.0
        let elapsed = max(0, total - Double(entry.daysUntil))
        let progress = min(1.0, elapsed / total)

        return VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.secondary.opacity(0.2))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.macBcBlue)
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 8)

            HStack {
                Text("Last payment")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("Next: \(entry.nextDate)")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
