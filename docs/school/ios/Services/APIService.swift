import Foundation

struct APIService {
    static let base = URL(string: "https://school.heyitsmejosh.com")!

    static func grades() async throws -> GradesPayload {
        let url = base.appendingPathComponent("api/grades")
        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(GradesPayload.self, from: data)
    }

    static func quizzes() async throws -> QuizData {
        let url = base.appendingPathComponent("api/quizzes")
        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(QuizData.self, from: data)
    }
}
