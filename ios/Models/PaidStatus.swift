import Foundation

struct PaidStatus: Codable, Sendable {
    let paid: Bool
    let month: String?
    let updatedAt: String?
}
