import WidgetKit
import SwiftUI

struct MacBenefitsWidget: Widget {
    let kind = "MacBenefitsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MacBenefitsProvider()) { entry in
            MacBenefitsWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Benefits")
        .description("What you're owed, at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct MacBenefitsWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MacBenefitsEntry

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
                Image(systemName: "list.bullet.rectangle.fill")
                    .foregroundStyle(Color.macBcBlue)
                Text("Benefits")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(entry.paymentAmount)
                .font(.title2.bold().monospacedDigit())

            Text("Total monthly")
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Medium

    private var mediumView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "list.bullet.rectangle.fill")
                    .foregroundStyle(Color.macBcBlue)
                Text("Benefits")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                Spacer()
                Text("Updated \(entry.lastUpdated)")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(spacing: 16) {
                benefitColumn("Total", entry.paymentAmount, primary: true)
                benefitColumn("Support", entry.supportAmount, primary: false)
                benefitColumn("Shelter", entry.shelterAmount, primary: false)
            }

            Spacer()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Large

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "list.bullet.rectangle.fill")
                    .foregroundStyle(Color.macBcBlue)
                Text("Benefits Breakdown")
                    .font(.headline)
                Spacer()
                Text(entry.date, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            benefitRow("Total Payment", entry.paymentAmount, icon: "dollarsign.circle.fill")
            benefitRow("Support Allowance", entry.supportAmount, icon: "person.fill")
            benefitRow("Shelter Allowance", entry.shelterAmount, icon: "house.fill")

            Divider()

            HStack {
                Image(systemName: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Last updated \(entry.lastUpdated)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }

    // MARK: - Helpers

    private func benefitColumn(_ label: String, _ value: String, primary: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(primary ? .callout.bold().monospacedDigit() : .caption.bold().monospacedDigit())
                .foregroundStyle(primary ? Color.primary : .secondary)
        }
    }

    private func benefitRow(_ label: String, _ value: String, icon: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(Color.macBcBlue)
                .frame(width: 20)
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(value)
                .font(.subheadline.bold().monospacedDigit())
        }
        .padding(.vertical, 4)
    }
}
