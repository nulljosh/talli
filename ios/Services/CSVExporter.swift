import Foundation

enum CSVExporter {
    static func exportBenefits(dashboard: DashboardData) -> URL? {
        let statusTexts = dashboard.statusMessages.map(\.text).joined(separator: " | ")
        let statusTimestamps = dashboard.statusMessages.compactMap(\.timestamp).joined(separator: " | ")

        var headers = [
            "payment_amount",
            "next_payment_date",
            "status_messages",
            "status_message_timestamps",
            "status_message_count"
        ]

        var values = [
            dashboard.paymentAmount ?? "",
            dashboard.nextPaymentDate ?? "",
            statusTexts,
            statusTimestamps,
            String(dashboard.statusMessages.count)
        ]

        for (index, message) in dashboard.statusMessages.enumerated() {
            headers.append("message_\(index + 1)_text")
            values.append(message.text)

            headers.append("message_\(index + 1)_timestamp")
            values.append(message.timestamp ?? "")
        }

        let csv = [
            headers.map(escape).joined(separator: ","),
            values.map(escape).joined(separator: ",")
        ].joined(separator: "\n")

        let timestamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("tally-benefits-\(timestamp).csv")

        do {
            try csv.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }

    private static func escape(_ value: String) -> String {
        let escaped = value.replacingOccurrences(of: "\"", with: "\"\"")
        return "\"\(escaped)\""
    }
}
