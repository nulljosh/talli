import Foundation

struct ReadMessages: Codable, Sendable {
    let readIds: [String]
    let updatedAt: String?

    init(readIds: [String] = [], updatedAt: String? = nil) {
        self.readIds = readIds
        self.updatedAt = updatedAt
    }
}
