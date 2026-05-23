import WidgetKit
import SwiftUI

struct MacPaymentProvider: TimelineProvider {
    func placeholder(in context: Context) -> MacPaymentEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MacPaymentEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: MacWidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MacPaymentEntry>) -> Void) {
        Task {
            var summary: MacTallySummary?
            do { summary = try await MacWidgetAPI.fetchSummary() } catch { summary = MacWidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: MacTallySummary?) -> MacPaymentEntry {
        let payDate = MacWidgetAPI.nextPaymentDate()
        return MacPaymentEntry(
            date: .now,
            amount: summary?.payment.total ?? "--",
            nextDate: payDate.formatted,
            daysUntil: payDate.daysUntil,
            isPlaceholder: false
        )
    }
}
