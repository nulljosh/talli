import Foundation

struct DashboardData: Codable, Sendable {
    struct StatusMessage: Codable, Identifiable, Sendable {
        let id: String
        let text: String
        let timestamp: String?
        let actionRequired: Bool

        init(id: String = UUID().uuidString, text: String, timestamp: String? = nil, actionRequired: Bool = false) {
            self.id = id
            self.text = text
            self.timestamp = timestamp
            self.actionRequired = actionRequired
        }
    }

    /// Monthly disability income, derived server-side by deriveIncome() in
    /// src/programs/profiles.js so web and native cannot disagree. Optional so a
    /// response from an older server still decodes.
    struct Income: Codable, Sendable {
        let pwdMonthly: Double
        let cdbMonthly: Double
        let totalMonthly: Double
        // Server counts BC's published paydays for the year. Optional: older
        // servers don't send them.
        let yearTotal: Double?
        let yearRemaining: Double?
        let paymentsLeft: Int?
    }

    struct Earnings: Codable, Sendable {
        let year: Int?
        let earned: Double?
        let exemption: Double?
        let left: Double?
        let over: Double?
    }

    struct YearReview: Codable, Sendable {
        struct Item: Codable, Sendable {
            let date: String
            let what: String
            let amount: Double
        }
        struct Totals: Codable, Sendable {
            let benefits: Double
            let credits: Double
            let earnings: Double
            let all: Double
        }
        let year: Int
        let complete: Bool
        let items: [Item]
        let totals: Totals

        /// Writes the year as a CSV for tax time and returns the file to share.
        func csvFile() -> URL {
            let rows = ["Date,What,Amount"] + items.map { "\($0.date),\"\($0.what)\",\(String(format: "%.2f", $0.amount))" }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("talli-\(year).csv")
            try? rows.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
            return url
        }
    }

    struct Assets: Codable, Sendable {
        let counted: Double?
        let exempt: Double?
        let limit: Double?
        let left: Double?
        let over: Bool?
    }

    let paymentAmount: String?
    let nextPaymentDate: String?
    let statusMessages: [StatusMessage]
    let income: Income?
    let earnings: Earnings?
    let assets: Assets?
    let yearReview: YearReview?

    enum CodingKeys: String, CodingKey {
        case paymentAmount = "payment_amount"
        case nextPaymentDate = "next_date"
        case statusMessages = "messages"
        case income
        case earnings
        case assets
        case yearReview = "year_review"
    }

    init(paymentAmount: String?, nextPaymentDate: String?, statusMessages: [StatusMessage], income: Income? = nil, earnings: Earnings? = nil, assets: Assets? = nil, yearReview: YearReview? = nil) {
        self.paymentAmount = paymentAmount
        self.nextPaymentDate = nextPaymentDate
        self.statusMessages = statusMessages
        self.income = income
        self.earnings = earnings
        self.assets = assets
        self.yearReview = yearReview
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        paymentAmount = try container.decodeIfPresent(String.self, forKey: .paymentAmount)
        nextPaymentDate = try container.decodeIfPresent(String.self, forKey: .nextPaymentDate)
        income = try container.decodeIfPresent(Income.self, forKey: .income)
        earnings = try container.decodeIfPresent(Earnings.self, forKey: .earnings)
        assets = try container.decodeIfPresent(Assets.self, forKey: .assets)
        yearReview = try? container.decodeIfPresent(YearReview.self, forKey: .yearReview)

        if let stringMessages = try? container.decode([String].self, forKey: .statusMessages) {
            statusMessages = stringMessages.map { StatusMessage(id: Self.stableId($0), text: $0) }
        } else if let objectMessages = try? container.decode([MessageObject].self, forKey: .statusMessages) {
            statusMessages = objectMessages.map { message in
                let text = message.text
                    ?? [message.subject, message.body].compactMap { $0 }.joined(separator: " - ")
                let timestamp = message.timestamp ?? message.date
                return StatusMessage(
                    id: message.id ?? Self.stableId(text + (timestamp ?? "")),
                    text: text,
                    timestamp: timestamp,
                    actionRequired: message.actionRequired ?? false
                )
            }.filter { !$0.text.isEmpty }
        } else {
            statusMessages = []
        }
    }

    // ponytail: no server-supplied id (string-array path, or object path missing id) — hash the
    // content so read state survives a refetch instead of a random UUID that never matches twice.
    // Swift's Hasher is randomly seeded per launch, so a plain FNV-1a is used instead.
    private static func stableId(_ content: String) -> String {
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in content.utf8 {
            hash ^= UInt64(byte)
            hash = hash &* 0x100000001b3
        }
        return String(hash)
    }
}

private struct MessageObject: Codable {
    let id: String?
    let text: String?
    let timestamp: String?
    let subject: String?
    let body: String?
    let date: String?
    let actionRequired: Bool?
}
