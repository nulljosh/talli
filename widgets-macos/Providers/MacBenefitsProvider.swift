import WidgetKit
import SwiftUI

struct MacBenefitsProvider: TimelineProvider {
    func placeholder(in context: Context) -> MacBenefitsEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MacBenefitsEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: MacWidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MacBenefitsEntry>) -> Void) {
        Task {
            var summary: MacTallySummary?
            do { summary = try await MacWidgetAPI.fetchSummary() } catch { summary = MacWidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: MacTallySummary?) -> MacBenefitsEntry {
        let updated: String
        if let ts = summary?.lastUpdated {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
            if let date = formatter.date(from: ts) {
                let relative = RelativeDateTimeFormatter()
                relative.unitsStyle = .short
                updated = relative.localizedString(for: date, relativeTo: .now)
            } else {
                updated = ts
            }
        } else {
            updated = "--"
        }

        return MacBenefitsEntry(
            date: .now,
            paymentAmount: summary?.payment.total ?? "--",
            supportAmount: summary?.payment.support ?? "--",
            shelterAmount: summary?.payment.shelter ?? "--",
            lastUpdated: updated,
            isPlaceholder: false
        )
    }
}
