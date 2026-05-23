import WidgetKit
import SwiftUI

struct MessagesProvider: TimelineProvider {
    func placeholder(in context: Context) -> MessagesEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MessagesEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: WidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MessagesEntry>) -> Void) {
        Task {
            var summary: TallySummary?
            do { summary = try await WidgetAPI.fetchSummary() } catch { summary = WidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: TallySummary?) -> MessagesEntry {
        MessagesEntry(
            date: .now,
            unreadCount: summary?.counts.messages ?? 0,
            requestCount: summary?.counts.requests ?? 0,
            hasNotifications: (summary?.counts.notifications ?? 0) > 0,
            isPlaceholder: false
        )
    }
}
