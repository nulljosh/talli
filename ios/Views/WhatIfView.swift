import SwiftUI

// What if I take a job, shared by iPhone and Mac. The maths is src/programs/whatif.js
// via /api/whatif: wage and hours in, the yearly earnings limit, the clawback and the
// money month by month out.
struct WhatIf: Codable, Sendable {
    struct Row: Codable, Sendable, Identifiable {
        let month: String
        let earnings: Double
        let reduction: Double
        let assistance: Double
        let total: Double
        var id: String { month }
    }
    let unknown: Bool?
    let rows: [Row]?
    let totalEarnings: Double?
    let keep: Double?
    let firstClawback: String?
    let assistanceEnds: String?
    let better: Double?
    let assumed: Bool?
    let room: Double?
    let safeHours: Double?
    let note: String?
    let monthlyRule: Bool?
    let rule: String?
}

struct WhatIfRequest: Codable, Sendable {
    let wage: Double
    let hours: Double
    let start: String
    let province: String
}

private let monthKey: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM"
    return f
}()

struct WhatIfView: View {
    let run: (_ request: WhatIfRequest) async throws -> WhatIf

    @State private var wage = ""
    @State private var hours = ""
    @State private var start = ""
    @State private var province = "bc"
    @State private var result: WhatIf?
    @State private var notice = ""

    private let money = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))

    private var months: [(String, String)] {
        let cal = Calendar.current
        return (1...12).compactMap { i in
            guard let d = cal.date(byAdding: .month, value: i, to: cal.date(from: cal.dateComponents([.year, .month], from: Date())) ?? Date()) else { return nil }
            return (monthKey.string(from: d), d.formatted(.dateTime.month(.wide).year()))
        }
    }

    private func label(_ key: String) -> String {
        monthKey.date(from: key)?.formatted(.dateTime.month(.wide).year()) ?? key
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private func numberField(_ title: String, _ text: Binding<String>) -> some View {
        TextField(title, text: text)
            #if os(iOS)
            .keyboardType(.decimalPad)
            #endif
            .textFieldStyle(.roundedBorder)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            card {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Type a wage and weekly hours. Talli shows how much of your yearly earnings limit it uses, when your assistance starts to drop, and what you end up with each month.")
                        .font(.footnote).foregroundStyle(.secondary)
                    HStack {
                        numberField("Hourly wage ($)", $wage)
                        numberField("Hours a week", $hours)
                    }
                    Picker("Where do you live?", selection: $province) {
                        Text("British Columbia (PWD)").tag("bc")
                        Text("Alberta (AISH)").tag("ab")
                        Text("Ontario (ODSP)").tag("on")
                    }
                    Picker("Starting", selection: $start) {
                        ForEach(months, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    Button("See what happens") {
                        guard let w = Double(wage), let h = Double(hours) else { return }
                        Task {
                            do { result = try await run(WhatIfRequest(wage: w, hours: h, start: start.isEmpty ? (months.first?.0 ?? "") : start, province: province)); notice = "" }
                            catch { notice = "Enter an hourly wage and weekly hours." }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(Double(wage) == nil || Double(hours) == nil)
                    if !notice.isEmpty { Text(notice).font(.footnote.weight(.semibold)).foregroundStyle(.orange) }
                }
            }
            if let r = result { results(r) }
        }
        .onAppear { if start.isEmpty { start = months.first?.0 ?? "" } }
    }

    @ViewBuilder
    private func results(_ r: WhatIf) -> some View {
        if r.unknown == true {
            card { Text("Talli does not have the yearly earnings limit for your household. Ask the ministry what it is, then you can work this out.").font(.footnote) }
        } else if let keep = r.keep, let earned = r.totalEarnings, let rows = r.rows {
            card {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Over 12 months you earn \(earned.formatted(money)) and keep").font(.footnote).foregroundStyle(.secondary)
                    Text(keep.formatted(money)).font(.system(size: 32, weight: .bold)).contentTransition(.numericText())
                    if r.monthlyRule == true, let row = rows.first {
                        Text(row.reduction > 0 ? "Each month your assistance is cut by \(row.reduction.formatted(money)), leaving \(row.assistance.formatted(money))." : "You stay under the first limit, so your assistance does not change.")
                            .font(.footnote)
                    } else if let first = r.firstClawback {
                        Text("Until \(label(first)) working costs you nothing. After that, each dollar over your limit comes off your assistance." + (r.assistanceEnds.map { " Assistance reaches zero in \(label($0))." } ?? ""))
                            .font(.footnote)
                    } else {
                        Text("You stay under your yearly limit, so your assistance does not change.").font(.footnote)
                    }
                    if let better = r.better {
                        Text("You end up \(abs(better).formatted(money)) \(better >= 0 ? "ahead of" : "behind") not working.")
                            .font(.footnote.weight(.bold)).foregroundStyle(better >= 0 ? Color.green : Color.orange)
                    }
                    if r.monthlyRule == true, let rule = r.rule {
                        Text(rule + (r.room.map { " The first \($0.formatted(money)) is about " } ?? "") + (r.safeHours.map { "\($0.formatted(.number.precision(.fractionLength(0...1)))) hours a week at your wage." } ?? ""))
                            .font(.caption).foregroundStyle(.secondary)
                    } else if let room = r.room {
                        Text("Room left under the limit this year: \(room.formatted(money))." + (r.safeHours.map { " That is about \($0.formatted(.number.precision(.fractionLength(0...1)))) hours a week from your start month to December." } ?? ""))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if r.assumed == true { Text("BC has not posted next year limit yet. Talli assumes it stays the same.").font(.caption2).foregroundStyle(.secondary) }
                }
            }
            DisclosureGroup("Month by month") {
                VStack(spacing: 4) {
                    ForEach(rows) { m in
                        HStack {
                            Text(label(m.month)).frame(maxWidth: .infinity, alignment: .leading)
                            Text("+" + m.earnings.formatted(money)).frame(width: 70, alignment: .trailing)
                            Text(m.reduction > 0 ? "-" + m.reduction.formatted(money) : "0").foregroundStyle(m.reduction > 0 ? Color.orange : .secondary).frame(width: 70, alignment: .trailing)
                            Text(m.total.formatted(money)).fontWeight(.semibold).frame(width: 74, alignment: .trailing)
                        }
                        .font(.caption)
                    }
                    Text("Month, pay, assistance cut, total money").font(.caption2).foregroundStyle(.secondary)
                }
                .padding(.top, 6)
            }
            .font(.footnote.weight(.semibold))
            if let note = r.note { Text(note).font(.caption2).foregroundStyle(.secondary) }
        }
    }
}
