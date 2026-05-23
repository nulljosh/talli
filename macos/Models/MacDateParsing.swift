import Foundation

enum MacDateParsing {
    nonisolated(unsafe) private static let isoFormatter = ISO8601DateFormatter()
    private static let fallbackFormatters: [DateFormatter] = {
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd",
            "yyyy/MM/dd",
            "MMM d, yyyy",
        ]
        return formats.map { fmt in
            let f = DateFormatter()
            f.locale = Locale(identifier: "en_US_POSIX")
            f.dateFormat = fmt
            return f
        }
    }()

    static func parse(_ value: String) -> Date? {
        if let date = isoFormatter.date(from: value) { return date }
        for formatter in fallbackFormatters {
            if let date = formatter.date(from: value) { return date }
        }
        return nil
    }
}
