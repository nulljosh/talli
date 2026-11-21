import SwiftUI

// Money log, shared by iPhone and Mac: work earnings in, expenses out, how much of the
// yearly earnings limit is used, and the tax-time export. /api/money-log does the maths
// (src/programs/profiles.js); earnings share the blob the Home limit row reads.
struct MoneyLog: Codable, Sendable {
    struct Entry: Codable, Sendable, Hashable {
        let date: String
        let amount: Double
        let note: String?
    }
    struct Summary: Codable, Sendable {
        let year: Int
        let earned: Double
        let exemption: Double?
        let left: Double?
        let over: Double?
    }
    struct Review: Codable, Sendable {
        struct Item: Codable, Sendable {
            let date: String
            let what: String
            let amount: Double
        }
        let year: Int
        let items: [Item]
    }
    let earnings: [Entry]
    let expenses: [Entry]
    let summary: Summary
    let review: Review
}

/// Each list is sent whole; a nil list is left alone on the server.
struct MoneyLogRequest: Codable, Sendable {
    var earnings: [MoneyLog.Entry]?
    var expenses: [MoneyLog.Entry]?
}

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

@MainActor
struct MoneyLogView: View {
    let fetch: (_ save: MoneyLogRequest?) async throws -> MoneyLog

    @State private var data: MoneyLog?
    @State private var spent = false
    @State private var date = Date()
    @State private var amount = ""
    @State private var note = ""

    private let money = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0...2))

    var body: some View {
        Group {
            if let data { content(data) } else { ProgressView().frame(maxWidth: .infinity) }
        }
        .task { data = try? await fetch(nil) }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    /// False when the save failed, so the form keeps what was typed.
    @discardableResult
    private func save(_ request: MoneyLogRequest) async -> Bool {
        guard let saved = try? await fetch(request) else { return false }
        data = saved
        return true
    }

    private func content(_ d: MoneyLog) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let exemption = d.summary.exemption, exemption > 0 {
                card { EarningsLimitBar(year: d.summary.year, earned: d.summary.earned, exemption: exemption, over: d.summary.over ?? 0) }
            }
            card {
                VStack(alignment: .leading, spacing: 12) {
                    Picker("Kind", selection: $spent) {
                        Text("Earned").tag(false)
                        Text("Spent").tag(true)
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    HStack {
                        TextField("$", text: $amount)
                            #if os(iOS)
                            .keyboardType(.decimalPad)
                            #endif
                            .frame(maxWidth: 110)
                        TextField(spent ? "Bus pass" : "Cafe shift", text: $note)
                    }
                    .textFieldStyle(.roundedBorder)
                    Button(spent ? "Add expense" : "Add earnings") {
                        guard let a = Double(amount), a > 0 else { return }
                        let entry = MoneyLog.Entry(date: isoDay.string(from: date), amount: a, note: note.trimmingCharacters(in: .whitespaces))
                        let request = spent ? MoneyLogRequest(expenses: d.expenses + [entry]) : MoneyLogRequest(earnings: d.earnings + [entry])
                        Task { if await save(request) { amount = ""; note = "" } }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled((Double(amount) ?? 0) <= 0)
                }
            }
            let rows = thisYear(d)
            if !rows.isEmpty {
                card {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(rows, id: \.key) { row in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(row.entry.note?.isEmpty == false ? row.entry.note! : (row.spent ? "Expense" : "Work earnings")).font(.subheadline.weight(.semibold))
                                    Text(isoDay.date(from: row.entry.date)?.formatted(.dateTime.month(.abbreviated).day()) ?? row.entry.date).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("\(row.spent ? "-" : "+")\(row.entry.amount.formatted(money))").font(.subheadline).foregroundStyle(row.spent ? .secondary : .primary)
                                Button { Task { await save(remove(row, from: d)) } } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                                    .buttonStyle(.plain).accessibilityLabel("Remove")
                            }
                        }
                    }
                }
            }
            if !d.review.items.isEmpty {
                ShareLink(item: csvFile(d.review)) {
                    Label("Export \(String(d.review.year)) for tax time", systemImage: "square.and.arrow.up")
                }
            }
        }
    }

    private struct Row { let key: String; let index: Int; let spent: Bool; let entry: MoneyLog.Entry }

    // This year's entries, newest first. `index` points back into its own list for removal.
    private func thisYear(_ d: MoneyLog) -> [Row] {
        let year = String(d.summary.year)
        let earned = d.earnings.enumerated().map { Row(key: "e\($0.offset)", index: $0.offset, spent: false, entry: $0.element) }
        let spentRows = d.expenses.enumerated().map { Row(key: "x\($0.offset)", index: $0.offset, spent: true, entry: $0.element) }
        return (earned + spentRows).filter { $0.entry.date.hasPrefix(year) }.sorted { $0.entry.date > $1.entry.date }
    }

    private func remove(_ row: Row, from d: MoneyLog) -> MoneyLogRequest {
        var list = row.spent ? d.expenses : d.earnings
        list.remove(at: row.index)
        return row.spent ? MoneyLogRequest(expenses: list) : MoneyLogRequest(earnings: list)
    }

    private func csvFile(_ review: MoneyLog.Review) -> URL {
        let rows = ["Date,What,Amount"] + review.items.map { "\($0.date),\"\($0.what.replacingOccurrences(of: "\"", with: "\"\""))\",\(String(format: "%.2f", $0.amount))" }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("talli-\(review.year).csv")
        try? rows.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

/// How much of the yearly earnings limit is used. Red once past it; the amount over comes off assistance.
@MainActor
struct EarningsLimitBar: View {
    let year: Int
    let earned: Double
    let exemption: Double
    let over: Double

    private let money = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Work earnings \(String(year))").foregroundStyle(.secondary)
                Spacer()
                Text("\(earned.formatted(money)) of \(exemption.formatted(money))").fontWeight(.semibold)
            }
            .font(.footnote)
            ProgressView(value: min(earned, exemption), total: exemption)
                .tint(over > 0 ? .red : .accentColor)
            Text(over > 0 ? "\(over.formatted(money)) over. Assistance drops by that much." : "\(max(0, exemption - earned).formatted(money)) left before assistance changes.")
                .font(.caption).foregroundStyle(over > 0 ? .red : .secondary)
        }
        .accessibilityElement(children: .combine)
    }
}
