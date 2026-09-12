import Foundation

struct TalliSummary: Codable {
    let paymentAmount: String
    let nextDate: String
    let messages: [TalliMessage]
    let pwdApproved: Bool

    enum CodingKeys: String, CodingKey {
        case paymentAmount = "payment_amount"
        case nextDate = "next_date"
        case messages
        case pwdApproved = "pwd_approved"
    }

    init(paymentAmount: String, nextDate: String, messages: [TalliMessage], pwdApproved: Bool = false) {
        self.paymentAmount = paymentAmount
        self.nextDate = nextDate
        self.messages = messages
        self.pwdApproved = pwdApproved
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        paymentAmount = try c.decode(String.self, forKey: .paymentAmount)
        nextDate = try c.decode(String.self, forKey: .nextDate)
        messages = try c.decode([TalliMessage].self, forKey: .messages)
        pwdApproved = try c.decodeIfPresent(Bool.self, forKey: .pwdApproved) ?? false
    }
}

struct TalliMessage: Codable, Identifiable {
    let id: String
    let text: String
    let timestamp: String
}
