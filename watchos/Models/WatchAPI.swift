import Foundation

final class WatchAPI {
    static let shared = WatchAPI()

    private let baseURL = "https://tally.heyitsmejosh.com"
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let defaults = UserDefaults.standard

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        session = URLSession(configuration: config)
    }

    func fetchSummary(token: String) async throws -> TallySummary {
        guard let url = URL(string: baseURL + "/api/summary") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.setValue(token, forHTTPHeaderField: "x-api-token")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        let summary = try decoder.decode(TallySummary.self, from: data)
        cache(data)
        return summary
    }

    func cachedSummary() -> TallySummary? {
        guard let data = defaults.data(forKey: "cache_summary") else { return nil }
        return try? decoder.decode(TallySummary.self, from: data)
    }

    var apiToken: String {
        get { defaults.string(forKey: "api_token") ?? "" }
        set { defaults.set(newValue, forKey: "api_token") }
    }

    private func cache(_ data: Data) {
        defaults.set(data, forKey: "cache_summary")
        defaults.set(Date().timeIntervalSince1970, forKey: "cache_summary_time")
    }
}
