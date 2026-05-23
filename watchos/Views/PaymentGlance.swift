import SwiftUI

struct PaymentGlance: View {
    @State private var summary: TallySummary?
    @State private var isLoading = true

    private var daysUntilPayment: Int? {
        guard let summary else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let payDate = formatter.date(from: summary.nextDate) else { return nil }
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let end = calendar.startOfDay(for: payDate)
        return calendar.dateComponents([.day], from: start, to: end).day
    }

    private var formattedDate: String {
        guard let summary else { return "--" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: summary.nextDate) else { return summary.nextDate }
        let display = DateFormatter()
        display.dateFormat = "MMM d"
        return display.string(from: date)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Text("NEXT PAYMENT")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let summary {
                    VStack(spacing: 4) {
                        Text(summary.paymentAmount)
                            .font(.title2.bold())
                            .foregroundStyle(.primary)

                        if let days = daysUntilPayment {
                            Text(days == 0 ? "Today" : days == 1 ? "Tomorrow" : "\(days) days")
                                .font(.title3)
                                .foregroundStyle(Color.bcBlue)
                        }

                        Text(formattedDate)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)

                    Divider()

                    if let days = daysUntilPayment, days > 0 {
                        ProgressView(value: max(0, 1.0 - Double(days) / 30.0))
                            .tint(Color.bcBlue)
                            .padding(.horizontal, 8)
                    }
                } else {
                    Text("No data")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 4)
        }
        .task {
            await loadData()
        }
    }

    private func loadData() async {
        if let cached = WatchAPI.shared.cachedSummary() {
            summary = cached
            isLoading = false
        }
        let token = WatchAPI.shared.apiToken
        guard !token.isEmpty else {
            isLoading = false
            return
        }
        do {
            summary = try await WatchAPI.shared.fetchSummary(token: token)
        } catch {
            // Keep cached data on failure
        }
        isLoading = false
    }
}

extension Color {
    static let bcBlue = Color(red: 0x1a/255, green: 0x5a/255, blue: 0x96/255)
    static let bcAccent = Color(red: 0x4e/255, green: 0x9c/255, blue: 0xd7/255)
}
