import Foundation

enum CRADates {
    /// Next GST/HST credit payment: the 5th of Jan/Apr/Jul/Oct.
    static func nextGSTPayment(after date: Date = .now) -> Date {
        let cal = Calendar.current
        let year = cal.component(.year, from: date)
        let candidates = [1, 4, 7, 10].flatMap { month in
            [year, year + 1].compactMap { cal.date(from: DateComponents(year: $0, month: month, day: 5)) }
        }
        // ponytail: fixed statutory schedule, swap for API data if CRA dates ever come from the scraper
        return candidates.filter { $0 > date }.min() ?? date
    }

    static var nextGSTPaymentText: String {
        nextGSTPayment().formatted(date: .abbreviated, time: .omitted)
    }

    // ponytail: last known quarterly amount — no live source (scraper covers BC Self-Serve,
    // not CRA My Account). Upgrade path: CRA My Account integration or manual entry in Settings.
    static let lastKnownGSTQuarterlyText = "$174.50"
}
