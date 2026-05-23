import Foundation

struct Report: Codable, Identifiable, Sendable {
    let id: String
    let month: String
    let status: String
    let submittedDate: String?
}
