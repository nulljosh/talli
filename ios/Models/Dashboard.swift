import Foundation

struct Dashboard: Codable, Sendable {
    let income: String?
    let nextPaymentDate: String?
    let benefitType: String?
    let status: String?
    let messages: [Message]?
    let tableData: String?

    struct Message: Codable, Identifiable, Sendable {
        let id: String?
        let subject: String?
        let date: String?
        let body: String?

        var stableId: String { id ?? (subject ?? "unknown") }
    }
}
