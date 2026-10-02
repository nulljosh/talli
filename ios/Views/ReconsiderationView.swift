import SwiftUI

// Reconsideration helper, shared by iPhone and Mac. Dates, checklist and the
// draft letter come from src/programs/reconsideration.js via /api/reconsideration.
struct Reconsideration: Codable, Sendable {
    struct Link: Codable, Sendable, Identifiable {
        let label: String
        let url: String
        var id: String { url }
    }
    struct Derived: Codable, Sendable {
        let received: String
        let deadline: String
        let left: Int
        let status: String
        let steps: [String]
        let draft: String
        let note: String
        let links: [Link]
        let phone: String
    }
    let received: String?
    let derived: Derived?
}

struct ReconsiderationRequest: Codable, Sendable { let received: String }

private let isoDay: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

struct ReconsiderationView: View {
    let fetch: (_ received: String?) async throws -> Reconsideration

    @State private var data: Reconsideration?
    @State private var editing = false
    @State private var date = Date()

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

    private func load(_ received: String?) async {
        guard let d = try? await fetch(received) else { return }
        data = d
        if let r = d.received, let parsed = isoDay.date(from: r) { date = parsed }
        if received != nil { editing = false }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private var setup: some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Denied? You can ask again.").font(.headline)
                Text("You have 20 business days from the day the letter arrived. Enter that day and Talli counts it for you.")
                    .font(.footnote).foregroundStyle(.secondary)
                DatePicker("Day the letter arrived", selection: $date, in: ...Date(), displayedComponents: .date)
                HStack {
                    Button("Save") { Task { await load(isoDay.string(from: date)) } }.buttonStyle(.borderedProminent)
                    if editing { Button("Cancel") { editing = false } }
                }
            }
        }
    }

    private func results(_ d: Reconsideration.Derived) -> some View {
        let tone: Color = d.status == "passed" ? .red : (d.status == "soon" || d.status == "today") ? .orange : .accentColor
        let deadline = isoDay.date(from: d.deadline)?.formatted(.dateTime.month(.wide).day().year()) ?? d.deadline
        return VStack(alignment: .leading, spacing: 12) {
            card {
                VStack(alignment: .leading, spacing: 4) {
                    if d.status == "passed" {
                        Text("The 20 days ended \(deadline)").font(.headline).foregroundStyle(tone)
                        Text("Call Disability Alliance BC on \(d.phone). They can tell you if a late request or a new application is your best move.")
                            .font(.footnote).foregroundStyle(.secondary)
                    } else {
                        Text(d.status == "today" ? "Today" : "\(d.left)").font(.system(size: 34, weight: .bold)).foregroundStyle(tone)
                        Text(d.status == "today" ? "is the last day to hand it in" : "business days left to ask for reconsideration").font(.subheadline)
                        Text("Deadline \(deadline)").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("WHAT TO DO").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    ForEach(Array(d.steps.enumerated()), id: \.offset) { i, s in
                        Text("\(i + 1). \(s)").font(.footnote).foregroundStyle(.secondary)
                    }
                    Text(d.note).font(.caption2).foregroundStyle(.secondary)
                }
            }
            card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("DRAFT LETTER").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    Text(d.draft).font(.footnote).textSelection(.enabled)
                    ShareLink(item: d.draft) { Label("Copy or send the letter", systemImage: "square.and.arrow.up") }.font(.footnote)
                }
            }
            HStack {
                if let tel = URL(string: "tel:" + d.phone.filter { !$0.isWhitespace }) { Link("Call \(d.phone)", destination: tel).buttonStyle(.borderedProminent) }
            }
            ForEach(d.links) { l in
                if let url = URL(string: l.url) { Link(l.label, destination: url).font(.footnote) }
            }
            Button("Change the date") { editing = true }.font(.footnote)
        }
    }
}
