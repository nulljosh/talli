import Foundation

struct ReportSubmissionRequest: Codable, Sendable {
    let sin: String
    let phone: String
    let pin: String
    let dryRun: Bool
}

struct ReportSubmissionResponse: Codable, Sendable {
    let success: Bool?
    let message: String?
    let preview: String?
    let submittedAt: String?
    let error: String?
}
