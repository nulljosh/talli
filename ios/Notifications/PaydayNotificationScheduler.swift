import Foundation
import UserNotifications

// ponytail: local notifications only, no APNs/device tokens/server/background mode. Both
// triggers are calendar dates (reporting window is always days 1-5, payday is a known future
// date from the scrape), so UNCalendarNotificationTrigger covers it with zero backend work.
// See roadmap.md "Stashed 2026-08-10" for why a push backend was rejected.
enum PaydayNotificationScheduler {
    static let paydayId = "talli.payday"
    static let reportingWindowId = "talli.reporting-window"

    /// The next day-1-of-month at 9am. Only fires for *this* month if today is day 1
    /// (window just opened); any other day of the month means the next occurrence is
    /// next month's day 1, whether the window is open (days 2-5) or closed (6+).
    static func nextReportingWindowFireDate(from now: Date, calendar: Calendar = .current) -> Date? {
        let day = calendar.component(.day, from: now)
        let targetMonth = day == 1 ? now : calendar.date(byAdding: .month, value: 1, to: now)
        guard let targetMonth else { return nil }
        var components = calendar.dateComponents([.year, .month], from: targetMonth)
        components.day = 1
        components.hour = 9
        components.minute = 0
        return calendar.date(from: components)
    }

    /// 9am the day before `paymentDate`, or 9am today if that has already passed.
    static func paydayReminderFireDate(paymentDate: Date, from now: Date, calendar: Calendar = .current) -> Date? {
        guard let dayBefore = calendar.date(byAdding: .day, value: -1, to: paymentDate) else { return nil }
        var components = calendar.dateComponents([.year, .month, .day], from: max(dayBefore, now))
        components.hour = 9
        components.minute = 0
        return calendar.date(from: components)
    }

    static func requestAuthorizationIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    /// Reschedules both reminders. Safe to call after every dashboard refresh -- replacing
    /// a pending request with the same identifier is a no-op if the date hasn't moved.
    static func reschedule(nextPaymentDate: Date?, now: Date = Date()) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized else { return }

        center.removePendingNotificationRequests(withIdentifiers: [paydayId, reportingWindowId])

        if let fireDate = nextReportingWindowFireDate(from: now) {
            schedule(
                id: reportingWindowId,
                title: "Reporting window is open",
                body: "You can file your monthly report now through the 5th.",
                fireDate: fireDate,
                center: center
            )
        }

        if let paymentDate = nextPaymentDate, let fireDate = paydayReminderFireDate(paymentDate: paymentDate, from: now) {
            schedule(
                id: paydayId,
                title: "Payment coming tomorrow",
                body: "Your next payment is expected tomorrow.",
                fireDate: fireDate,
                center: center
            )
        }
    }

    private static func schedule(id: String, title: String, body: String, fireDate: Date, center: UNUserNotificationCenter) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        center.add(request)
    }
}
