import SwiftUI

// Budget against paydays, shared by iPhone and Mac. Bills by day of the month are lined
// up with the cheques that pay them by src/programs/budget.js via /api/budget.
struct Budget: Codable, Sendable {
    struct Bill: Codable, Sendable, Identifiable {
        let id: String
        let name: String
        let amount: Double
        let day: Int
    }
    struct Due: Codable, Sendable, Identifiable {
        let date: String
        let id: String
        let name: String
        let amount: Double
        var key: String { date + id }
    }
    struct Period: Codable, Sendable, Identifiable {
        let from: String
        let to: String
        let current: Bool
        let income: Double
        let bills: [Due]
        let billsTotal: Double
        let left: Double
        var id: String { from }
    }
    let bills: [Bill]
    let periods: [Period]
    let short: [String]
    let monthlyBills: Double
}

struct BudgetRequest: Codable, Sendable { let bills: [Budget.Bill] }

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

struct BudgetView: View {
    let fetch: (_ save: BudgetRequest?) async throws -> Budget

    @State private var data: Budget?
    @State private var name = ""
    @State private var amount = ""
    @State private var day = ""

    private let money = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))

    var body: some View {
        Group {
            if let data { content(data) } else { ProgressView().frame(maxWidth: .infinity) }
        }
        .task { data = try? await fetch(nil) }
    }

    private func short(_ iso: String) -> String { isoDay.date(from: iso)?.formatted(.dateTime.month(.abbreviated).day()) ?? iso }
    private func dayBefore(_ iso: String) -> String { isoDay.date(from: iso).flatMap { Calendar.current.date(byAdding: .day, value: -1, to: $0) }.map { isoDay.string(from: $0) } ?? iso }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private func field(_ title: String, _ text: Binding<String>, numeric: Bool) -> some View {
        TextField(title, text: text)
            #if os(iOS)
            .keyboardType(numeric ? .numbersAndPunctuation : .default)
            #endif
            .textFieldStyle(.roundedBorder)
    }

    private func save(_ bills: [Budget.Bill]) async { data = (try? await fetch(BudgetRequest(bills: bills))) ?? data }

    private func content(_ d: Budget) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Add your bills and the day each is due. Talli lines them up against the cheques that pay for them and warns you when one lands before the money does.")
                        .font(.footnote).foregroundStyle(.secondary)
                    ForEach(d.bills) { b in
                        HStack {
                            Text(b.name).font(.subheadline.weight(.semibold))
                            Spacer()
                            Text("\(b.amount.formatted(money)) on the \(b.day)").font(.footnote).foregroundStyle(.secondary)
                            Button { Task { await save(d.bills.filter { $0.id != b.id }) } } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                                .buttonStyle(.plain).accessibilityLabel("Remove")
                        }
                        Divider()
                    }
                    HStack {
                        field("Rent", $name, numeric: false)
                        field("$", $amount, numeric: true).frame(maxWidth: 90)
                        field("Day", $day, numeric: true).frame(maxWidth: 60)
                    }
                    Button("Add bill") {
                        guard let a = Double(amount), let dd = Int(day) else { return }
                        let bill = Budget.Bill(id: "b" + String(Int(Date().timeIntervalSince1970), radix: 36), name: name, amount: a, day: dd)
                        Task { await save(d.bills + [bill]); name = ""; amount = ""; day = "" }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || Double(amount) == nil || Int(day) == nil)
                }
            }
            if !d.bills.isEmpty {
                ForEach(d.periods) { p in
                    card {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("\(short(p.from)) to \(short(dayBefore(p.to)))\(p.current ? " · now" : "")").font(.caption).foregroundStyle(.secondary)
                                Spacer()
                                Text("\(p.income.formatted(money)) in").font(.caption).foregroundStyle(.secondary)
                            }
                            Text("\(p.left < 0 ? "-" : "")\(abs(p.left).formatted(money)) \(p.left < 0 ? "short" : "left")")
                                .font(.title3.weight(.bold)).foregroundStyle(p.left < 0 ? Color.orange : .primary)
                            ForEach(p.bills) { b in
                                HStack {
                                    Text("\(short(b.date)) \(b.name)").font(.caption).foregroundStyle(.secondary)
                                    Spacer()
                                    Text(b.amount.formatted(money)).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(p.left < 0 ? Color.orange.opacity(0.6) : .clear))
                }
                if !d.short.isEmpty {
                    Text("One of these periods is short. Ask for a later due date, or call the ministry about a crisis supplement before the bill is late.")
                        .font(.footnote.weight(.semibold)).foregroundStyle(.orange)
                }
            }
        }
    }
}
