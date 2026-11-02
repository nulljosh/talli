import Foundation

/// BC's published cheque issue dates, so the watch knows the next payday with no phone, no network and
/// nothing cached. Month index (0 = Jan) to day, from src/pay-dates.js; tools/test-pay-schedule-sync.js fails if they drift.
enum PaySchedule {
    static let payDatesByYear: [Int: [Int: Int]] = [
        2026: [0: 21, 1: 25, 2: 25, 3: 22, 4: 27, 5: 24, 6: 29, 7: 26, 8: 23, 9: 21, 10: 18, 11: 16],
        2027: [0: 20, 1: 24, 2: 24, 3: 21, 4: 19, 5: 23, 6: 21, 7: 25, 8: 22, 9: 20, 10: 24, 11: 22]
    ]

    /// The next issue date on or after today as "yyyy-MM-dd", or nil once the published schedule runs out.
    static func next(after now: Date = .now, calendar: Calendar = .current) -> String? {
        let today = calendar.dateComponents([.year, .month, .day], from: now)
        let key = String(format: "%04d-%02d-%02d", today.year ?? 0, today.month ?? 0, today.day ?? 0)
        return payDatesByYear.keys.sorted().flatMap { y in
            (payDatesByYear[y] ?? [:]).keys.sorted().map { m in String(format: "%04d-%02d-%02d", y, m + 1, payDatesByYear[y]![m]!) }
        }.first { $0 >= key }
    }
}
