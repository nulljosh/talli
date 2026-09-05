// Standalone self-check for the pure date math in PaydayNotificationScheduler.
// Run with: swift ios/Notifications/test_payday_dates.swift
// (Copies the two static functions verbatim since UserNotifications needs a real app target.)
import Foundation

enum Scheduler {
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

    static func paydayReminderFireDate(paymentDate: Date, from now: Date, calendar: Calendar = .current) -> Date? {
        guard let dayBefore = calendar.date(byAdding: .day, value: -1, to: paymentDate) else { return nil }
        var components = calendar.dateComponents([.year, .month, .day], from: max(dayBefore, now))
        components.hour = 9
        components.minute = 0
        return calendar.date(from: components)
    }
}

var cal = Calendar(identifier: .gregorian)
cal.timeZone = TimeZone(identifier: "America/Vancouver")!

func date(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 0) -> Date {
    cal.date(from: DateComponents(year: y, month: m, day: d, hour: h))!
}

func assertDay(_ got: Date?, _ y: Int, _ m: Int, _ d: Int, _ h: Int, _ label: String) {
    guard let got else { fatalError("FAIL \(label): got nil") }
    let c = cal.dateComponents([.year, .month, .day, .hour], from: got)
    precondition(c.year == y && c.month == m && c.day == d && c.hour == h, "FAIL \(label): got \(c)")
    print("ok  \(label)")
}

// Today is day 1 -> fires today at 9am (the window just opened).
assertDay(Scheduler.nextReportingWindowFireDate(from: date(2026, 9, 1), calendar: cal), 2026, 9, 1, 9, "day 1 -> fires today")

// Mid-window (day 3) -> next occurrence is next month's 1st.
assertDay(Scheduler.nextReportingWindowFireDate(from: date(2026, 9, 3), calendar: cal), 2026, 10, 1, 9, "mid-window -> next month")

// After the window (day 20) -> fires next month's 1st.
assertDay(Scheduler.nextReportingWindowFireDate(from: date(2026, 9, 20), calendar: cal), 2026, 10, 1, 9, "after window -> next month")

// December -> January year rollover.
assertDay(Scheduler.nextReportingWindowFireDate(from: date(2026, 12, 20), calendar: cal), 2027, 1, 1, 9, "december -> january rollover")

// Payday in 5 days -> fires the day before at 9am.
assertDay(Scheduler.paydayReminderFireDate(paymentDate: date(2026, 9, 23), from: date(2026, 9, 18), calendar: cal), 2026, 9, 22, 9, "payday reminder day before")

// Payday is tomorrow -> "day before" is today, still fires today at 9am (not in the past if run before 9am).
assertDay(Scheduler.paydayReminderFireDate(paymentDate: date(2026, 9, 19), from: date(2026, 9, 18, 14), calendar: cal), 2026, 9, 18, 9, "payday reminder clamps to today")

print("all payday scheduler checks passed")
