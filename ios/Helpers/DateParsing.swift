import Foundation

enum DateParsing {
    private static let formatters: [DateFormatter] = {
        let patterns = [
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd",
            "MMM d, yyyy",
        ]
        return patterns.map {
            let f = DateFormatter()
            f.locale = Locale(identifier: "en_US_POSIX")
            f.dateFormat = $0
            return f
        }
    }()

    static func parse(_ raw: String) -> Date? {
        for f in formatters {
            if let d = f.date(from: raw) { return d }
        }
        return ISO8601DateFormatter().date(from: raw)
    }
}
