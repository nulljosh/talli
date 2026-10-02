import SwiftUI

// Benefit finder, shared by iPhone and Mac. Questions and results come from
// /api/benefit-finder (src/programs/finder.js); this only renders them.
struct BenefitFinder: Codable, Sendable {
    struct Option: Codable, Sendable, Identifiable { let id: String; let label: String }
    struct Question: Codable, Sendable, Identifiable {
        let id: String
        let text: String
        let hint: String?
        let multi: Bool?
        let skipIf: [String: [String]]?
        let options: [Option]
    }
    struct Result: Codable, Sendable, Identifiable {
        let id: String
        let group: String
        let name: String
        let value: String
        let yearly: Int?
        let why: String
        let how: [String]
        let say: String?
        let phone: String?
        let link: String
        let auto: Bool
        let first: String?
        let have: Bool
    }
    let verified: String
    let questions: [Question]
    let answers: [String: [String]]
    let complete: Bool
    let results: [Result]
    let missingYearly: Int
    let missingCount: Int
}

struct BenefitFinderRequest: Codable, Sendable { let answers: [String: [String]] }

private let finderGroups = [("crisis", "Help this week"), ("money", "Money to claim"), ("savings", "Free and cheaper"), ("help", "People who help")]

struct BenefitFinderView: View {
    /// nil answers loads what the server has; non nil saves and returns results.
    let fetch: (_ answers: [String: [String]]?) async throws -> BenefitFinder

    @State private var data: BenefitFinder?
    @State private var answers: [String: [String]] = [:]
    @State private var step: String?
    @State private var open: String?
    @State private var failed = false

    var body: some View {
        Group {
            if let data {
                if let step, let q = asked.first(where: { $0.id == step }) {
                    question(q)
                } else if data.complete {
                    results(data)
                } else {
                    intro
                }
            } else if failed {
                Text("Could not load the benefit finder.").font(.footnote).foregroundStyle(.secondary)
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task { await load(nil) }
    }

    private func load(_ posted: [String: [String]]?) async {
        do {
            let d = try await fetch(posted)
            data = d
            answers = d.answers
        } catch { failed = data == nil }
    }

    // Same skip rule the server applies, so the flow reacts before the round trip.
    private var asked: [BenefitFinder.Question] {
        (data?.questions ?? []).filter { q in
            guard let skip = q.skipIf else { return true }
            return !skip.allSatisfy { k, v in (answers[k] ?? []).contains(where: v.contains) }
        }
    }

    private var intro: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Find what you are missing").font(.headline)
            Text("A few questions, about a minute. Talli checks every BC and federal program and tells you how to get each one.")
                .font(.footnote).foregroundStyle(.secondary)
            Button("Start") { step = (asked.first { (answers[$0.id] ?? []).isEmpty } ?? asked.first)?.id }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private func question(_ q: BenefitFinder.Question) -> some View {
        let list = asked
        let i = list.firstIndex { $0.id == q.id } ?? 0
        let picked = answers[q.id] ?? []
        let multi = q.multi ?? false
        func go(_ a: [String: [String]]) {
            answers = a
            let rest = asked
            if let at = rest.firstIndex(where: { $0.id == q.id }), at + 1 < rest.count {
                step = rest[at + 1].id
            } else {
                step = nil
                Task { await load(a) }
            }
        }
        return VStack(alignment: .leading, spacing: 12) {
            ProgressView(value: Double(i + 1), total: Double(list.count)).tint(.accentColor)
            Text(q.text).font(.headline)
            if let hint = q.hint { Text(hint).font(.footnote).foregroundStyle(.secondary) }
            ForEach(q.options) { o in
                let on = picked.contains(o.id)
                Button {
                    if multi {
                        answers[q.id] = on ? picked.filter { $0 != o.id } : picked + [o.id]
                    } else {
                        var a = answers; a[q.id] = [o.id]; go(a)
                    }
                } label: {
                    Text(o.label)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(on ? Color.accentColor.opacity(0.12) : .clear)
                            .strokeBorder(on ? Color.accentColor : Color.secondary.opacity(0.25)))
                }
                .buttonStyle(.plain)
            }
            HStack {
                Button(i == 0 ? "Cancel" : "Back") { step = i == 0 ? nil : list[i - 1].id }
                Spacer()
                if multi {
                    Button(picked.isEmpty ? "None of these" : "Done") { var a = answers; a[q.id] = picked; go(a) }
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private func results(_ d: BenefitFinder) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                if d.missingYearly > 0 {
                    Text("You could be missing up to").font(.footnote).foregroundStyle(.secondary)
                    Text("\(d.missingYearly.formatted(.currency(code: "CAD").precision(.fractionLength(0)))) a year")
                        .font(.system(size: 30, weight: .bold)).contentTransition(.numericText())
                } else {
                    Text("You are getting the big ones.").font(.headline)
                }
                Text("\(d.missingCount) programs to look at. Tap one for the steps. Tick the ones you already get.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Change my answers") { step = asked.first?.id }.font(.footnote).padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))

            ForEach(finderGroups, id: \.0) { group, title in
                let rows = d.results.filter { $0.group == group }
                if !rows.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .ltrTracking(1.5)
                            .foregroundStyle(group == "crisis" ? Color.accentColor : .secondary)
                        ForEach(rows) { r in row(r) }
                    }
                }
            }
            Text("Rates checked \(d.verified). Talli is a guide. Each program makes its own decision.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func row(_ r: BenefitFinder.Result) -> some View {
        let isOpen = open == r.id
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Button {
                    var a = answers
                    var have = a["have"] ?? []
                    if r.have { have.removeAll { $0 == r.id } } else { have.append(r.id) }
                    a["have"] = have
                    answers = a
                    Task { await load(a) }
                } label: {
                    Image(systemName: r.have ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(r.have ? Color.green : Color.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("I already get this")
                Button {
                    withAnimation(.easeOut(duration: 0.2)) { open = isOpen ? nil : r.id }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.name).font(.subheadline.weight(.semibold))
                        Text(r.value).font(.caption.weight(.semibold)).foregroundStyle(Color.accentColor)
                        if let note = r.first ?? (r.auto ? "Automatic" : nil) {
                            Text(note).font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            }
            if isOpen {
                VStack(alignment: .leading, spacing: 8) {
                    Text(r.why).font(.footnote)
                    ForEach(Array(r.how.enumerated()), id: \.offset) { i, h in
                        Text("\(i + 1). \(h)").font(.footnote).foregroundStyle(.secondary)
                    }
                    if let say = r.say {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("WHAT TO SAY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                            Text(say).font(.footnote).textSelection(.enabled)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
                    }
                    HStack {
                        if let phone = r.phone, let url = URL(string: "tel:" + phone.filter { !$0.isWhitespace }) {
                            Link("Call \(phone)", destination: url).buttonStyle(.borderedProminent)
                        }
                        if let url = URL(string: r.link) { Link("Official page", destination: url).buttonStyle(.bordered) }
                    }
                    .font(.footnote)
                }
                .padding(.leading, 28)
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(r.have ? Color.green.opacity(0.4) : Color.secondary.opacity(0.2)))
        .opacity(r.have && !isOpen ? 0.6 : 1)
    }
}
