import SwiftUI

// My household, shared by iPhone and Mac: couples, families, rent and shelter.
// Table figures and the cheque check come from src/programs/household.js.
struct Household: Codable, Sendable {
    struct RentChange: Codable, Sendable, Identifiable { let date: String; let rent: Double; var id: String { date } }
    struct Profile: Codable, Sendable { let type: String?; let children: Int; let rent: Double? }
    struct Shelter: Codable, Sendable { let min: Double; let max: Double; let paid: Double? }
    struct Mismatch: Codable, Sendable { let expected: Double; let actual: Double; let diff: Double }
    struct Derived: Codable, Sendable {
        let type: String
        let children: Int
        let unit: Int
        let rent: Double?
        let history: [RentChange]
        let support: Double
        let shelter: Shelter
        let transport: Double
        let youCover: Double?
        let monthlyMax: Double
        let expected: Double?
        let earningsExemption: Double?
        let shared: Bool
        let mismatch: Mismatch?
        let say: String?
    }
    let profile: Profile
    let derived: Derived?
}

struct HouseholdRequest: Codable, Sendable {
    let type: String
    let children: Int
    let rent: Double?
}

private let householdTypes = [("single", "Just me"), ("couple_one", "Couple, one of us on PWD"), ("couple_both", "Couple, both on PWD"), ("single_parent", "Single parent")]

struct HouseholdView: View {
    let fetch: (_ save: HouseholdRequest?) async throws -> Household

    @State private var data: Household?
    @State private var editing = false
    @State private var type = ""
    @State private var children = ""
    @State private var rent = ""

    private let money = FloatingPointFormatStyle<Double>.Currency(code: "CAD")

    var body: some View {
        Group {
            if let data {
                if let d = data.derived, !editing { results(d) } else { setup }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task { await load(nil) }
    }

    private func load(_ save: HouseholdRequest?) async {
        guard let d = try? await fetch(save) else { return }
        data = d
        type = d.profile.type ?? type
        children = d.profile.children > 0 ? String(d.profile.children) : children
        rent = d.profile.rent.map { String(Int($0)) } ?? rent
        if save != nil { editing = false }
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
            .keyboardType(.numbersAndPunctuation)
            #endif
            .textFieldStyle(.roundedBorder)
    }

    private var setup: some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Who is in your household?").font(.headline)
                ForEach(householdTypes, id: \.0) { id, label in
                    Button { type = id } label: {
                        Text(LocalizedStringKey(label))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(type == id ? Color.accentColor.opacity(0.12) : .clear)
                                .strokeBorder(type == id ? Color.accentColor : Color.secondary.opacity(0.25)))
                    }
                    .buttonStyle(.plain)
                }
                if !type.isEmpty, type != "single" { numberField("Children living with you", $children) }
                numberField("Your rent a month ($)", $rent)
                HStack {
                    Button("Save") {
                        Task { await load(HouseholdRequest(type: type, children: Int(children) ?? 0, rent: Double(rent))) }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(type.isEmpty)
                    if editing { Button("Cancel") { editing = false } }
                }
            }
        }
    }

    private func line(_ name: String, _ value: String, strong: Bool = false) -> some View {
        HStack {
            Text(LocalizedStringKey(name)).font(.footnote).foregroundStyle(strong ? Color.primary : .secondary)
            Spacer()
            Text(value).font(.footnote.weight(strong ? .bold : .semibold))
        }
    }

    private func results(_ d: Household.Derived) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let m = d.mismatch {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Your cheque is off from the table").font(.subheadline.weight(.bold)).foregroundStyle(.orange)
                    Text("My Self Serve says \(m.actual.formatted(money)). The table says \(m.expected.formatted(money)) for your household and rent.").font(.footnote)
                    if let say = d.say {
                        Text(say).font(.footnote).textSelection(.enabled)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
                    }
                    if let tel = URL(string: "tel:1-866-866-0800") { Link("Call 1-866-866-0800", destination: tel).buttonStyle(.borderedProminent).tint(.orange).font(.footnote) }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.orange.opacity(0.08)))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.orange.opacity(0.35)))
            }
            card {
                VStack(alignment: .leading, spacing: 4) {
                    line("Support allowance", d.support.formatted(money))
                    line(d.rent == nil ? "Shelter, up to" : "Shelter paid", (d.shelter.paid ?? d.shelter.max).formatted(money))
                    line("Bus supplement", "+" + d.transport.formatted(money))
                    line(d.rent == nil ? "Most you can get" : "Per month by the table", (d.rent == nil ? d.monthlyMax : (d.expected ?? d.monthlyMax)).formatted(money), strong: true)
                    if let over = d.youCover, over > 0 {
                        Text("Your rent is \(over.formatted(money)) over the shelter maximum. That part comes out of your support.")
                            .font(.footnote.weight(.semibold)).foregroundStyle(.orange)
                    }
                    Text("Shelter is paid between \(d.shelter.min.formatted(money)) and \(d.shelter.max.formatted(money)) for a household of \(d.unit).")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            card {
                VStack(alignment: .leading, spacing: 4) {
                    Text("WORK EARNINGS").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    if let ex = d.earningsExemption {
                        Text("You can earn \(ex.formatted(money)) this year before your payment drops." + (d.shared ? " The limit is shared by the two of you, so log both of your earnings." : ""))
                            .font(.footnote)
                    } else {
                        Text("Ask the ministry what your yearly earnings limit is. Talli does not have it for single parents.").font(.footnote)
                    }
                }
            }
            if !d.history.isEmpty {
                card {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("RENT CHANGES").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                        ForEach(d.history.reversed().prefix(5)) { h in line(h.date, h.rent.formatted(money)) }
                        Text("When your rent changes, update it here and tell the ministry.").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            Text("From the ministry rate table of December 1, 2025. Your cheque stub is the truth.").font(.caption2).foregroundStyle(.secondary)
            Button("Change my household or rent") { editing = true }.font(.footnote)
        }
    }
}
