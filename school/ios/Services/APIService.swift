import Foundation

struct APIService {
    static let base = URL(string: "https://school.heyitsmejosh.com")!

    private static func fetch<T: Decodable>(_ path: String) async throws -> T {
        let url = base.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func grades() async throws -> GradesPayload {
        try await fetch("api/grades")
    }

    static func quizzes() async throws -> QuizData {
        try await fetch("api/quizzes")
    }
}
