import WidgetKit
import SwiftUI

struct BenefitsProvider: TimelineProvider {
    func placeholder(in context: Context) -> BenefitsEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (BenefitsEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: WidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BenefitsEntry>) -> Void) {
        Task {
            var summary: TallySummary?
            do { summary = try await WidgetAPI.fetchSummary() } catch { summary = WidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: TallySummary?) -> BenefitsEntry {
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

        return BenefitsEntry(
            date: .now,
            paymentAmount: summary?.payment.total ?? "--",
            supportAmount: summary?.payment.support ?? "--",
            shelterAmount: summary?.payment.shelter ?? "--",
            lastUpdated: updated,
            isPlaceholder: false
        )
    }
}
