import Foundation

struct MacWidgetAPI {
    static let baseURL = "https://talli.jaybulb.com"
    #if compiler(>=5.10)
    private nonisolated(unsafe) static let defaults = UserDefaults(suiteName: "group.com.heyitsmejosh.tally")
    #else // Xcode 15 (macOS 13) builds
    private static let defaults = UserDefaults(suiteName: "group.com.heyitsmejosh.tally")
    #endif

    private static var session: URLSession {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        return URLSession(configuration: config)
    }

    // MARK: - Token

    static var apiToken: String? {
        defaults?.string(forKey: "api_token")
    }

    static func setAPIToken(_ token: String) {
        defaults?.set(token, forKey: "api_token")
    }

    // MARK: - Fetch

    static func fetchSummary() async throws -> MacTalliSummary {
        guard let token = apiToken, !token.isEmpty else {
            throw URLError(.userAuthenticationRequired)
        }
        guard let url = URL(string: baseURL + "/api/summary") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.setValue(token, forHTTPHeaderField: "x-api-token")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        let summary = try JSONDecoder().decode(MacTalliSummary.self, from: data)
        cache(data)
        return summary
    }

    static func cachedSummary() -> MacTalliSummary? {
        guard let data = defaults?.data(forKey: "widget_summary_mac") else { return nil }
        return try? JSONDecoder().decode(MacTalliSummary.self, from: data)
    }

    // MARK: - Next Payment Date

    static func nextPaymentDate() -> (formatted: String, daysUntil: Int) {
        // month index (0 = Jan) to day, from src/pay-dates.js; tools/test-pay-schedule-sync.js fails if they drift
        let payDatesByYear: [Int: [Int: Int]] = [
            2026: [0: 21, 1: 25, 2: 25, 3: 22, 4: 27, 5: 24, 6: 29, 7: 26, 8: 23, 9: 21, 10: 18, 11: 16],
            2027: [0: 20, 1: 24, 2: 24, 3: 21, 4: 19, 5: 23, 6: 21, 7: 25, 8: 22, 9: 20, 10: 24, 11: 22]
        ]

        let now = Date()
        let cal = Calendar.current
        let month = cal.component(.month, from: now) - 1
        let day = cal.component(.day, from: now)

        var targetMonth = month
        var targetYear = cal.component(.year, from: now)

        if let thisDay = payDatesByYear[targetYear]?[month], day <= thisDay {
            targetMonth = month
        } else {
            targetMonth = (month + 1) % 12
            if targetMonth == 0 { targetYear += 1 }
        }

        // no published date yet: show nothing rather than guess a benefits payment date
        guard let targetDay = payDatesByYear[targetYear]?[targetMonth] else { return ("--", 0) }
        var components = DateComponents()
        components.year = targetYear
        components.month = targetMonth + 1
        components.day = targetDay

        guard let targetDate = cal.date(from: components) else {
            return ("--", 0)
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let formatted = formatter.string(from: targetDate)
        let daysUntil = cal.dateComponents([.day], from: cal.startOfDay(for: now), to: targetDate).day ?? 0

        return (formatted, max(0, daysUntil))
    }

    // MARK: - Internal

    private static func cache(_ data: Data) {
        defaults?.set(data, forKey: "widget_summary_mac")
        defaults?.set(Date().timeIntervalSince1970, forKey: "widget_summary_mac_time")
    }
}
