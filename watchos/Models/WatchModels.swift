import Foundation

struct TalliSummary: Codable {
    let paymentAmount: String
    let nextDate: String
    let messages: [TalliMessage]

    enum CodingKeys: String, CodingKey {
        case paymentAmount = "payment_amount"
        case nextDate = "next_date"
        case messages
    }
}

struct TalliMessage: Codable, Identifiable {
    let id: String
    let text: String
    let timestamp: String
}
