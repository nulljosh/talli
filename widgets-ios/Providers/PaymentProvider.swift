import WidgetKit
import SwiftUI

struct PaymentProvider: TimelineProvider {
    func placeholder(in context: Context) -> PaymentEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (PaymentEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: WidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PaymentEntry>) -> Void) {
        Task {
            var summary: TallySummary?
            do { summary = try await WidgetAPI.fetchSummary() } catch { summary = WidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: TallySummary?) -> PaymentEntry {
        let payDate = WidgetAPI.nextPaymentDate()
        return PaymentEntry(
            date: .now,
            amount: summary?.payment.total ?? "--",
            nextDate: payDate.formatted,
            daysUntil: payDate.daysUntil,
            isPlaceholder: false
        )
    }
}
