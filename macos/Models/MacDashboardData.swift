import Foundation

struct MacDashboardData: Codable, Sendable {
    struct StatusMessage: Codable, Identifiable, Sendable {
        let id: String
        let text: String
        let timestamp: String?

        init(id: String = UUID().uuidString, text: String, timestamp: String? = nil) {
            self.id = id
            self.text = text
            self.timestamp = timestamp
        }
    }

    /// Monthly disability income, derived server-side by deriveIncome() in
    /// src/programs/profiles.js so web, iOS and macOS cannot disagree. Optional
    /// so a response from an older server still decodes.
    struct Income: Codable, Sendable {
        let pwdMonthly: Double
        let cdbMonthly: Double
        let totalMonthly: Double
    }

    let paymentAmount: String?
    let nextPaymentDate: String?
    let statusMessages: [StatusMessage]
    let income: Income?

    enum CodingKeys: String, CodingKey {
        case paymentAmount = "payment_amount"
        case nextPaymentDate = "next_date"
        case statusMessages = "messages"
        case income
    }

    init(paymentAmount: String?, nextPaymentDate: String?, statusMessages: [StatusMessage], income: Income? = nil) {
        self.paymentAmount = paymentAmount
        self.nextPaymentDate = nextPaymentDate
        self.statusMessages = statusMessages
        self.income = income
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        paymentAmount = try container.decodeIfPresent(String.self, forKey: .paymentAmount)
        nextPaymentDate = try container.decodeIfPresent(String.self, forKey: .nextPaymentDate)
        income = try container.decodeIfPresent(Income.self, forKey: .income)

        if let stringMessages = try? container.decode([String].self, forKey: .statusMessages) {
            statusMessages = stringMessages.map { StatusMessage(text: $0) }
        } else if let objectMessages = try? container.decode([MacMessageObject].self, forKey: .statusMessages) {
            statusMessages = objectMessages.map { msg in
                let text = [msg.subject, msg.body].compactMap { $0 }.joined(separator: " - ")
                return StatusMessage(
                    id: msg.id ?? UUID().uuidString,
                    text: text,
                    timestamp: msg.date
                )
            }.filter { !$0.text.isEmpty }
        } else {
            statusMessages = []
        }
    }
}

private struct MacMessageObject: Codable {
    let id: String?
    let subject: String?
    let body: String?
    let date: String?
}

struct MacLoginResponse: Codable {
    let success: Bool
    let error: String?
}
