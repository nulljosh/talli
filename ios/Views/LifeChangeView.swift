import SwiftUI

// Big changes, shared by iPhone and Mac: turning 65 and moving out of BC. Dates and
// steps come from src/programs/lifechange.js via /api/life.
struct LifeChange: Codable, Sendable {
    struct Link: Codable, Sendable, Identifiable { let label: String; let url: String; var id: String { url } }
    struct Life: Codable, Sendable { let birthYear: Int?; let birthMonth: Int?; let leaveDate: String? }
    struct Event: Codable, Sendable, Identifiable { let when: String; let what: String; let detail: String; var id: String { when } }
    struct Turning65: Codable, Sendable {
        let headline: String
        let stage: String
        let timeline: [Event]
        let steps: [String]
        let say: String
        let phone: String
        let links: [Link]
    }
    struct Leaving: Codable, Sendable {
        let leaveDate: String?
        let mspEnds: String?
        let steps: [String]
        let say: String
        let phone: String
        let links: [Link]
    }
    let life: Life
    let turning65: Turning65?
    let leaving: Leaving
}

struct LifeRequest: Codable, Sendable {
    var birthYear: Int?
    var birthMonth: Int?
    var leaveDate: String?
}

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

private let monthKey: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM"
    return f
}()

struct LifeChangeView: View {
    let fetch: (_ save: LifeRequest?) async throws -> LifeChange

    @State private var data: LifeChange?
    @State private var tab = "65"
    @State private var editing = false
    @State private var month = 0
    @State private var year = ""
    @State private var leave = Date()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("", selection: $tab) {
                Text("Turning 65").tag("65")
                Text("Moving out of BC").tag("move")
            }
            .pickerStyle(.segmented)
            if let data {
                if tab == "65" { turning(data) } else { moving(data) }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task { await load(nil) }
    }

    private func load(_ save: LifeRequest?) async {
        guard let d = try? await fetch(save) else { return }
        data = d
        month = d.life.birthMonth ?? month
        year = d.life.birthYear.map(String.init) ?? year
        if let l = d.life.leaveDate, let parsed = isoDay.date(from: l) { leave = parsed }
        if save != nil { editing = false }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private func name(_ key: String) -> String {
        monthKey.date(from: key)?.formatted(.dateTime.month(.wide).year()) ?? key
    }

    @ViewBuilder
    private func turning(_ d: LifeChange) -> some View {
        if let t = d.turning65, !editing {
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text(t.headline).font(.headline)
                    if t.stage == "apply" { Text("Apply for OAS and GIS now.").font(.footnote.weight(.bold)).foregroundStyle(.orange) }
                    else if t.stage == "open" { Text("You can apply for OAS and GIS now.").font(.footnote).foregroundStyle(.secondary) }
                    else if t.stage == "prepare" { Text("Start getting ready.").font(.footnote).foregroundStyle(.secondary) }
                    ForEach(t.timeline) { e in
                        Divider()
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(name(e.when)): \(e.what)").font(.footnote.weight(.semibold))
                            Text(e.detail).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            guide(steps: t.steps, say: t.say, phone: t.phone, links: t.links)
            Button("Change my birth month") { editing = true }.font(.footnote)
        } else {
            card {
                VStack(alignment: .leading, spacing: 10) {
                    Text("When were you born?").font(.headline)
                    Text("Month and year is enough.").font(.footnote).foregroundStyle(.secondary)
                    Picker("Month", selection: $month) {
                        Text("Month").tag(0)
                        ForEach(Array(Calendar.current.monthSymbols.enumerated()), id: \.offset) { i, m in Text(m).tag(i + 1) }
                    }
                    TextField("Year", text: $year)
                        #if os(iOS)
                        .keyboardType(.numberPad)
                        #endif
                        .textFieldStyle(.roundedBorder)
                    HStack {
                        Button("Save") { Task { await load(LifeRequest(birthYear: Int(year), birthMonth: month)) } }
                            .buttonStyle(.borderedProminent)
                            .disabled(month == 0 || Int(year) == nil)
                        if editing { Button("Cancel") { editing = false } }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func moving(_ d: LifeChange) -> some View {
        card {
            VStack(alignment: .leading, spacing: 8) {
                Text("Moving out of BC").font(.headline)
                DatePicker("Day you leave", selection: $leave, displayedComponents: .date)
                Button("Save the day") { Task { await load(LifeRequest(leaveDate: isoDay.string(from: leave))) } }.font(.footnote)
                if let ends = d.leaving.mspEnds {
                    Text("Your BC medical coverage runs to \(ends).").font(.footnote.weight(.bold))
                }
            }
        }
        guide(steps: d.leaving.steps, say: d.leaving.say, phone: d.leaving.phone, links: d.leaving.links)
    }

    private func guide(steps: [String], say: String, phone: String, links: [LifeChange.Link]) -> some View {
        card {
            VStack(alignment: .leading, spacing: 8) {
                Text("WHAT TO DO").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                ForEach(Array(steps.enumerated()), id: \.offset) { i, s in Text("\(i + 1). \(s)").font(.footnote).foregroundStyle(.secondary) }
                VStack(alignment: .leading, spacing: 4) {
                    Text("WHAT TO SAY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    Text(say).font(.footnote).textSelection(.enabled)
                    ShareLink(item: say) { Label("Copy or send", systemImage: "square.and.arrow.up") }.font(.caption)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
                if let tel = URL(string: "tel:" + phone.filter { !$0.isWhitespace }) { Link("Call \(phone)", destination: tel).buttonStyle(.borderedProminent).font(.footnote) }
                ForEach(links) { l in if let url = URL(string: l.url) { Link(l.label, destination: url).font(.footnote) } }
            }
        }
    }
}
