import SwiftUI

// RDSP grant and bond tracker, shared by iPhone and Mac. The maths is
// src/programs/rdsp.js, served by /api/rdsp-tracker; this only renders it.
struct RdspTracker: Codable, Sendable {
    struct Entry: Codable, Sendable, Identifiable, Hashable {
        let year: Int
        let contribution: Double
        let grant: Double
        let bond: Double
        var id: Int { year }
    }
    struct Profile: Codable, Sendable {
        let birthYear: Int?
        let dtcYear: Int?
        let band: String?
        let entries: [Entry]
    }
    struct Limit: Codable, Sendable { let got: Double; let cap: Double; let left: Double }
    struct Lifetime: Codable, Sendable { let grant: Limit; let bond: Limit; let contribution: Limit }
    struct Carry: Codable, Sendable { let grant: Double; let bond: Double; let years: Int }
    struct Derived: Codable, Sendable {
        let eligible: Bool
        let needsDtc: Bool
        let missing: Double
        let grantLeft: Double
        let bondLeft: Double
        let putToMax: Double
        let carry: Carry
        let lifetime: Lifetime
        let entries: [Entry]
    }
    let profile: Profile
    let derived: Derived?
}

struct RdspTrackerRequest: Codable, Sendable {
    var birthYear: Int?
    var dtcYear: Int?
    var band: String?
    var entries: [RdspTracker.Entry]?
}

private let rdspBands = [("low", "Under $38,237"), ("mid", "$38,237 to $117,045"), ("high", "Over $117,045")]

struct RdspTrackerView: View {
    let fetch: (_ patch: RdspTrackerRequest?) async throws -> RdspTracker

    @State private var data: RdspTracker?
    @State private var editing = false
    @State private var failed = false
    @State private var birth = ""
    @State private var dtc = ""
    @State private var band = "low"
    @State private var year = String(Calendar.current.component(.year, from: Date()))
    @State private var put = ""
    @State private var grant = ""
    @State private var bond = ""

    private let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))

    var body: some View {
        Group {
            if let data {
                if data.derived == nil || editing { setup(data) } else if let d = data.derived { results(d) }
            } else if failed {
                Text("Could not load the RDSP tracker.").font(.footnote).foregroundStyle(.secondary)
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task { await send(nil) }
    }

    private func send(_ patch: RdspTrackerRequest?) async {
        do {
            let d = try await fetch(patch)
            data = d
            birth = d.profile.birthYear.map(String.init) ?? birth
            dtc = d.profile.dtcYear.map(String.init) ?? dtc
            band = d.profile.band ?? band
        } catch { failed = data == nil }
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

    private func setup(_ d: RdspTracker) -> some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                Text("See what your RDSP is owed").font(.headline)
                Text("Three details. Talli works out what the government has matched, what is left this year and what carries forward.")
                    .font(.footnote).foregroundStyle(.secondary)
                HStack {
                    numberField("Year you were born", $birth)
                    numberField("Year DTC was approved", $dtc)
                }
                Text("Family income a year").font(.caption).foregroundStyle(.secondary)
                ForEach(rdspBands, id: \.0) { id, label in
                    Button { band = id } label: {
                        Text(label)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(band == id ? Color.accentColor.opacity(0.12) : .clear)
                                .strokeBorder(band == id ? Color.accentColor : Color.secondary.opacity(0.25)))
                    }
                    .buttonStyle(.plain)
                }
                HStack {
                    Button("Save") {
                        Task {
                            await send(RdspTrackerRequest(birthYear: Int(birth), dtcYear: Int(dtc), band: band))
                            if data?.derived != nil { editing = false }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    if editing { Button("Cancel") { editing = false } }
                }
                Text("No DTC yet? Leave that blank. The DTC comes first, and the grant and bond follow it.")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
    }

    private func results(_ d: RdspTracker.Derived) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            card {
                VStack(alignment: .leading, spacing: 4) {
                    if d.eligible {
                        Text("Still on the table this year").font(.footnote).foregroundStyle(.secondary)
                        Text(d.missing.formatted(cad)).font(.system(size: 30, weight: .bold)).contentTransition(.numericText())
                        Text("\(d.grantLeft.formatted(cad)) grant + \(d.bondLeft.formatted(cad)) bond." + (d.putToMax > 0 ? " Put in \(d.putToMax.formatted(cad)) to get the whole grant." : ""))
                            .font(.footnote).foregroundStyle(.secondary)
                        if d.carry.years > 0, d.carry.grant > 0 || d.carry.bond > 0 {
                            Text("\(d.carry.grant.formatted(cad)) grant and \(d.carry.bond.formatted(cad)) bond carried forward from the last \(d.carry.years) years. The yearly limits are $10,500 and $11,000, so catch up over a few years.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        if d.needsDtc {
                            Text("Add the year your DTC was approved to see what carries forward.")
                                .font(.footnote.weight(.semibold)).foregroundStyle(Color.accentColor)
                        }
                    } else {
                        Text("Grants and bonds stop after the year you turn 49. Your plan keeps growing and you can still contribute.")
                            .font(.subheadline.weight(.semibold))
                    }
                }
            }
            card {
                VStack(alignment: .leading, spacing: 12) {
                    limit("Grant received", d.lifetime.grant)
                    limit("Bond received", d.lifetime.bond)
                    limit("Contributions", d.lifetime.contribution)
                }
            }
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("WHAT YOUR STATEMENTS SHOW").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    if d.entries.isEmpty {
                        Text("Add each year from your RDSP statement: what you put in, the grant and the bond.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    ForEach(d.entries) { e in
                        HStack {
                            Text("\(String(e.year)) \(e.contribution.formatted(cad)) in, \(e.grant.formatted(cad)) grant, \(e.bond.formatted(cad)) bond").font(.footnote)
                            Spacer()
                            Button { Task { await send(RdspTrackerRequest(entries: d.entries.filter { $0.year != e.year })) } } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove")
                        }
                    }
                    HStack {
                        numberField("Year", $year)
                        numberField("Put in", $put)
                        numberField("Grant", $grant)
                        numberField("Bond", $bond)
                    }
                    Button("Save year") {
                        guard let y = Int(year) else { return }
                        let row = RdspTracker.Entry(year: y, contribution: Double(put) ?? 0, grant: Double(grant) ?? 0, bond: Double(bond) ?? 0)
                        Task {
                            await send(RdspTrackerRequest(entries: d.entries.filter { $0.year != y } + [row]))
                            put = ""; grant = ""; bond = ""
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            Button("Edit my details") { editing = true }.font(.footnote)
            Text("Estimate. Assumes the same family income every year and 2026 rates. Your RDSP statement and CRA My Account show the exact carry forward. Take money out within 10 years of the last grant or bond and you repay it.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func limit(_ title: String, _ l: RdspTracker.Limit) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(LocalizedStringKey(title)).font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(l.got.formatted(cad)) of \(l.cap.formatted(cad))").font(.footnote).foregroundStyle(.secondary)
            }
            ProgressView(value: min(l.got, l.cap), total: l.cap).tint(.accentColor)
        }
    }
}
