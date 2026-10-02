import SwiftUI
import UserNotifications

// Missed-payment alert, shared by iPhone and Mac. The cheque date, the likely
// cause and the script come from src/programs/missed.js via /api/missed-payment.
struct MissedPayment: Codable, Sendable {
    struct Missed: Codable, Sendable {
        let due: String
        let month: String
        let daysLate: Int
        let cause: String?
        let steps: [String]
        let say: String
        let phone: String
        let link: String
    }
    struct Watch: Codable, Sendable {
        let date: String
        let month: String
        let fireOn: String
    }
    let missed: Missed?
    let watch: [Watch]
}

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

/// 10am the day after each of the next two cheques, asking whether it arrived.
/// Marking the cheque received cancels that month's reminder.
enum MissedPaymentReminders {
    private static let prefix = "talli.missed."

    static func schedule(_ watch: [MissedPayment.Watch], now: Date = Date()) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
        guard await center.notificationSettings().authorizationStatus == .authorized else { return }
        for w in watch {
            guard let day = isoDay.date(from: w.fireOn) else { continue }
            var parts = Calendar.current.dateComponents([.year, .month, .day], from: day)
            parts.hour = 10
            guard let fire = Calendar.current.date(from: parts), fire > now else { continue }
            let content = UNMutableNotificationContent()
            content.title = "Has your cheque arrived?"
            content.body = "It was due yesterday and is not marked received. Open Talli for what to say if it is missing."
            content.sound = .default
            let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fire), repeats: false)
            try? await center.add(UNNotificationRequest(identifier: prefix + w.month, content: content, trigger: trigger))
        }
    }

    static func cancel(month: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [prefix + month])
    }
}

struct MissedPaymentView: View {
    let fetch: () async throws -> MissedPayment
    /// Marks the cheque for this month key (YYYY-MM) as received.
    let arrived: (_ month: String) async -> Void

    @State private var data: MissedPayment?
    @State private var open = false

    var body: some View {
        Group {
            if let m = data?.missed { card(m) }
        }
        .task { await load() }
    }

    private func load() async {
        guard let d = try? await fetch() else { return }
        data = d
        await MissedPaymentReminders.schedule(d.watch)
    }

    private func card(_ m: MissedPayment.Missed) -> some View {
        let due = isoDay.date(from: m.due)?.formatted(.dateTime.month(.wide).day()) ?? m.due
        return VStack(alignment: .leading, spacing: 10) {
            Text("Has your cheque arrived?").font(.subheadline.weight(.bold)).foregroundStyle(.orange)
            Text("It was due \(due)\(m.daysLate > 1 ? ", \(m.daysLate) days ago" : ""). You have not marked it received.").font(.footnote)
            HStack {
                Button("It arrived") {
                    Task {
                        await arrived(m.month)
                        MissedPaymentReminders.cancel(month: m.month)
                        await load()
                    }
                }
                .buttonStyle(.borderedProminent).tint(.orange)
                Button(open ? "Hide" : "Still missing") { withAnimation(.easeOut(duration: 0.2)) { open.toggle() } }
                    .buttonStyle(.bordered)
            }
            if open {
                VStack(alignment: .leading, spacing: 8) {
                    if let cause = m.cause {
                        Text(cause).font(.footnote)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(Color.orange.opacity(0.12)))
                    }
                    ForEach(Array(m.steps.enumerated()), id: \.offset) { i, s in
                        Text("\(i + 1). \(s)").font(.footnote).foregroundStyle(.secondary)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("WHAT TO SAY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                        Text(m.say).font(.footnote).textSelection(.enabled)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
                    HStack {
                        if let tel = URL(string: "tel:" + m.phone.filter { !$0.isWhitespace }) { Link("Call \(m.phone)", destination: tel).buttonStyle(.borderedProminent).tint(.orange) }
                        if let url = URL(string: m.link) { Link("My Self Serve", destination: url).buttonStyle(.bordered) }
                    }
                    .font(.footnote)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.orange.opacity(0.08)))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.orange.opacity(0.35)))
    }
}
