import Foundation

struct MacWidgetAPI {
    static let baseURL = "https://tally.heyitsmejosh.com"
    private static let defaults = UserDefaults(suiteName: "group.com.jt.tally")

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

    static func fetchSummary() async throws -> MacTallySummary {
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
        let summary = try JSONDecoder().decode(MacTallySummary.self, from: data)
        cache(data)
        return summary
    }

    static func cachedSummary() -> MacTallySummary? {
        guard let data = defaults?.data(forKey: "widget_summary_mac") else { return nil }
        return try? JSONDecoder().decode(MacTallySummary.self, from: data)
    }

    // MARK: - Next Payment Date

    static func nextPaymentDate() -> (formatted: String, daysUntil: Int) {
        let payDates2026: [Int: Int] = [
            0: 21, 1: 25, 2: 25, 3: 23, 4: 27, 5: 25,
            6: 23, 7: 26, 8: 24, 9: 28, 10: 25, 11: 16
        ]

        let now = Date()
        let cal = Calendar.current
        let month = cal.component(.month, from: now) - 1
        let day = cal.component(.day, from: now)

        var targetMonth = month
        var targetYear = cal.component(.year, from: now)

        if let thisDay = payDates2026[month], day <= thisDay {
            targetMonth = month
        } else {
            targetMonth = (month + 1) % 12
            if targetMonth == 0 { targetYear += 1 }
        }

        let targetDay = payDates2026[targetMonth] ?? 25
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
