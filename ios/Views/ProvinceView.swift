import SwiftUI

// Alberta and Ontario at a glance, shared by iPhone and Mac. Everything comes from the
// public /api/open/provinces (data/provinces/*.json via src/programs/provinces.js), so a
// person outside BC sees their next cheque, the earnings rule and when to report, with no account.
struct ProvinceList: Codable, Sendable {
    struct Report: Codable, Sendable { let dueDay: Int?; let text: String; let source: String }
    struct Province: Codable, Sendable, Identifiable {
        var id: String { code }
        let code: String
        let name: String
        let program: String
        let monthlySingle: Double
        let monthlyNote: String?
        let rule: String
        let earningsNote: String?
        let extra: String?
        let report: Report?
        let nextPayDate: String?
        let payments: String?
        let apply: String
        let confidence: String
    }
    let provinces: [Province]
}

@MainActor
struct ProvinceView: View {
    let fetch: () async throws -> ProvinceList

    @State private var list: [ProvinceList.Province] = []
    @State private var code = "ab"
    @State private var failed = false

    var body: some View {
        Group {
            if let p = list.first(where: { $0.code == code }) {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("Province", selection: $code) {
                        ForEach(list) { Text($0.name).tag($0.code) }
                    }
                    .pickerStyle(.segmented)
                    Text(p.program).font(.headline)
                    section("NEXT CHEQUE", p.nextPayDate.map(Self.day) ?? "Not published yet")
                    section("MONTHLY, SINGLE", "$\(Int(p.monthlySingle).formatted())", note: p.monthlyNote)
                    section("EARNINGS", p.rule, note: [p.earningsNote, p.extra].compactMap { $0 }.joined(separator: " "))
                    if let r = p.report { section("REPORTING", r.text) }
                    HStack(spacing: 16) {
                        if let pay = p.payments, let url = URL(string: pay) { Link("Payment dates", destination: url) }
                        if let url = URL(string: p.apply) { Link("How to apply", destination: url) }
                    }
                    .font(.footnote)
                    Text("Source: \(p.confidence)").font(.caption2).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else if failed {
                Text("Could not load province rules.").font(.footnote).foregroundStyle(.secondary)
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task {
            do { list = try await fetch().provinces.filter { $0.code != "bc" } } catch { failed = true }
        }
    }

    private func section(_ label: String, _ value: String, note: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            Text(value).font(.body)
            if let note, !note.isEmpty { Text(note).font(.footnote).foregroundStyle(.secondary) }
        }
    }

    /// "2026-10-27" to "Tuesday, October 27", read as a calendar day with no time zone shift.
    static func day(_ iso: String) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: iso) else { return iso }
        return d.formatted(.dateTime.weekday(.wide).month(.wide).day())
    }
}
