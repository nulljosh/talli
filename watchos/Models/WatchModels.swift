import Foundation

struct TallySummary: Codable {
    let paymentAmount: String
    let nextDate: String
    let messages: [TallyMessage]

    enum CodingKeys: String, CodingKey {
        case paymentAmount = "payment_amount"
        case nextDate = "next_date"
        case messages
    }
}

struct TallyMessage: Codable, Identifiable {
    let id: String
    let text: String
    let timestamp: String
}
