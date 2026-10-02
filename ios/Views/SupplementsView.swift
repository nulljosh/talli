import SwiftUI
import UserNotifications

// Supplements on the calendar, shared by iPhone and Mac. Dates and maths are
// src/programs/supplements.js, served by /api/supplements; reminders are local.
struct Supplements: Codable, Sendable {
    struct Saved: Codable, Sendable {
        var on: Bool
        var remind: Bool
        var amount: Double?
        var month: Int?
    }
    struct Profile: Codable, Sendable { let items: [String: Saved] }
    struct Item: Codable, Sendable, Identifiable {
        let id: String
        let name: String
        let kind: String
        let note: String
        let max: Double
        let on: Bool
        let remind: Bool
        let amount: Double?
        let month: Int?
        let needs: String?
    }
    struct Event: Codable, Sendable, Identifiable {
        let id: String
        let name: String
        let date: String
        let amount: Double
        let kind: String
        let remindOn: String
        let remind: Bool
        var key: String { id + date }
    }
    struct Derived: Codable, Sendable {
        let items: [Item]
        let upcoming: [Event]
        let monthly: Double
    }
    let profile: Profile
    let derived: Derived
}

struct SupplementsRequest: Codable, Sendable { let items: [String: Supplements.Saved] }

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

private let monthNames = Calendar.current.monthSymbols

/// One local notification per upcoming supplement, 9am the day before (a week before for the bus pass).
enum SupplementReminders {
    private static let prefix = "talli.supp."

    static func schedule(_ events: [Supplements.Event], now: Date = Date()) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
        guard await center.notificationSettings().authorizationStatus == .authorized else { return }
        let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD")
        for e in events.filter(\.remind).prefix(20) {
            guard let remindDay = isoDay.date(from: e.remindOn), let due = isoDay.date(from: e.date) else { continue }
            var parts = Calendar.current.dateComponents([.year, .month, .day], from: remindDay)
            parts.hour = 9
            guard let fire = Calendar.current.date(from: parts), fire > now else { continue }
            let content = UNMutableNotificationContent()
            content.title = e.name
            content.body = e.kind == "annual"
                ? "Renews \(due.formatted(.dateTime.month(.wide).day())). \(e.amount.formatted(cad))."
                : "\(e.amount.formatted(cad)) lands with your cheque tomorrow."
            content.sound = .default
            content.threadIdentifier = "talli.supplements"
            let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fire), repeats: false)
            try? await center.add(UNNotificationRequest(identifier: prefix + e.key, content: content, trigger: trigger))
        }
    }
}

struct SupplementsView: View {
    let fetch: (_ save: SupplementsRequest?) async throws -> Supplements

    @State private var data: Supplements?
    @State private var managing = false
    @State private var drafts: [String: String] = [:]

    private let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("SUPPLEMENTS").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary).ltrTracking(1.5)
                Spacer()
                Button(managing ? "Done" : "Manage") { withAnimation(.easeOut(duration: 0.2)) { managing.toggle() } }.font(.footnote)
            }
            if let d = data?.derived {
                if d.upcoming.isEmpty && !managing {
                    Text("Tick the supplements you get and they land on your calendar with a reminder.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(d.upcoming.prefix(3)) { e in
                    HStack {
                        Circle().fill(Color.orange).frame(width: 6, height: 6)
                        Text(e.name).font(.footnote)
                        Spacer()
                        Text(e.amount.formatted(cad)).font(.footnote.weight(.semibold))
                        Text(isoDay.date(from: e.date)?.formatted(.dateTime.month(.abbreviated).day()) ?? e.date)
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                if d.monthly > 0 {
                    Text("+\(d.monthly.formatted(cad)) a month on top of your cheque").font(.footnote.weight(.semibold))
                }
                if managing { manage(d) }
            }
        }
        .task { await send(nil) }
    }

    private func send(_ save: SupplementsRequest?) async {
        guard let d = try? await fetch(save) else { return }
        data = d
        await SupplementReminders.schedule(d.derived.upcoming)
    }

    private func patch(_ id: String, _ change: (inout Supplements.Saved) -> Void) {
        var items = data?.profile.items ?? [:]
        var one = items[id] ?? Supplements.Saved(on: false, remind: true, amount: nil, month: nil)
        change(&one)
        items[id] = one
        Task { await send(SupplementsRequest(items: items)) }
    }

    private func manage(_ d: Supplements.Derived) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(d.items) { it in
                VStack(alignment: .leading, spacing: 6) {
                    Toggle(isOn: Binding(get: { it.on }, set: { v in patch(it.id) { $0.on = v } })) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(it.name).font(.subheadline.weight(.semibold))
                            Text(it.note).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if it.on {
                        HStack {
                            if it.kind == "cheque" {
                                TextField("Amount a month", text: Binding(get: { drafts[it.id] ?? it.amount.map { String(Int($0)) } ?? "" }, set: { drafts[it.id] = $0 }))
                                    #if os(iOS)
                                    .keyboardType(.numbersAndPunctuation)
                                    #endif
                                    .textFieldStyle(.roundedBorder)
                                    .frame(maxWidth: 140)
                                Button("Set") { if let v = Double(drafts[it.id] ?? "") { patch(it.id) { $0.amount = v } } }.font(.footnote)
                            } else {
                                Picker("Renews in", selection: Binding(get: { it.month ?? 0 }, set: { m in patch(it.id) { $0.month = m == 0 ? nil : m } })) {
                                    Text("Pick a month").tag(0)
                                    ForEach(Array(monthNames.enumerated()), id: \.offset) { i, name in Text(name).tag(i + 1) }
                                }
                            }
                            Spacer()
                            Toggle("Remind me", isOn: Binding(get: { it.remind }, set: { v in patch(it.id) { $0.remind = v } })).font(.caption)
                        }
                        if let need = it.needs {
                            Text(need == "amount" ? "Add the amount to put it on the calendar" : "Pick the month to put it on the calendar")
                                .font(.caption.weight(.semibold)).foregroundStyle(Color.accentColor)
                        }
                    }
                }
            }
        }
        .padding(.top, 4)
    }
}
