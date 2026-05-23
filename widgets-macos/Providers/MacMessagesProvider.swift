import WidgetKit
import SwiftUI

struct MacMessagesProvider: TimelineProvider {
    func placeholder(in context: Context) -> MacMessagesEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MacMessagesEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        completion(buildEntry(from: MacWidgetAPI.cachedSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MacMessagesEntry>) -> Void) {
        Task {
            var summary: MacTallySummary?
            do { summary = try await MacWidgetAPI.fetchSummary() } catch { summary = MacWidgetAPI.cachedSummary() }
            let entry = buildEntry(from: summary)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func buildEntry(from summary: MacTallySummary?) -> MacMessagesEntry {
        MacMessagesEntry(
            date: .now,
            unreadCount: summary?.counts.messages ?? 0,
            requestCount: summary?.counts.requests ?? 0,
            hasNotifications: (summary?.counts.notifications ?? 0) > 0,
            isPlaceholder: false
        )
    }
}
