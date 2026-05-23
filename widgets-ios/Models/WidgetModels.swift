import WidgetKit

// MARK: - API Response

struct TallySummary: Codable {
    let payment: PaymentInfo
    let counts: CountsInfo
    let lastUpdated: String?
    let status: String

    struct PaymentInfo: Codable {
        let total: String?
        let support: String?
        let shelter: String?
    }

    struct CountsInfo: Codable {
        let messages: Int
        let notifications: Int
        let requests: Int
    }
}

// MARK: - Timeline Entries

struct PaymentEntry: TimelineEntry {
    let date: Date
    let amount: String
    let nextDate: String
    let daysUntil: Int
    let isPlaceholder: Bool

    static var placeholder: PaymentEntry {
        PaymentEntry(
            date: .now,
            amount: "$1,358.50",
            nextDate: "Apr 23",
            daysUntil: 12,
            isPlaceholder: true
        )
    }
}

struct BenefitsEntry: TimelineEntry {
    let date: Date
    let paymentAmount: String
    let supportAmount: String
    let shelterAmount: String
    let lastUpdated: String
    let isPlaceholder: Bool

    static var placeholder: BenefitsEntry {
        BenefitsEntry(
            date: .now,
            paymentAmount: "$1,358.50",
            supportAmount: "$1,060.50",
            shelterAmount: "$298.00",
            lastUpdated: "Today",
            isPlaceholder: true
        )
    }
}

struct MessagesEntry: TimelineEntry {
    let date: Date
    let unreadCount: Int
    let requestCount: Int
    let hasNotifications: Bool
    let isPlaceholder: Bool

    static var placeholder: MessagesEntry {
        MessagesEntry(
            date: .now,
            unreadCount: 2,
            requestCount: 1,
            hasNotifications: true,
            isPlaceholder: true
        )
    }
}
