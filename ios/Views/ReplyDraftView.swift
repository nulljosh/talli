import SwiftUI

// Reply helper under a ministry message, shared by iPhone and Mac. The read and the
// draft come from src/programs/reply.js via /api/message-reply. Talli writes the
// reply; the person sends it in My Self Serve or says it on the phone.
struct MessageReply: Codable, Sendable {
    let kind: String
    let label: String
    let asks: String
    let reply: String
    let extra: [String]
    let phone: String
    let link: String
    let note: String
}

struct MessageReplyRequest: Codable, Sendable { let text: String }

struct ReplyDraftView: View {
    let text: String
    let fetch: (_ text: String) async throws -> MessageReply

    @State private var draft: MessageReply?
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(open ? "Hide reply" : "Draft a reply") {
                if draft != nil { withAnimation(.easeOut(duration: 0.2)) { open.toggle() }; return }
                Task {
                    draft = try? await fetch(text)
                    withAnimation(.easeOut(duration: 0.2)) { open = draft != nil }
                }
            }
            .buttonStyle(.bordered)
            .font(.footnote)

            if open, let d = draft {
                VStack(alignment: .leading, spacing: 8) {
                    Text(d.label.uppercased()).font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                    Text(d.asks).font(.footnote)
                    Text(d.reply).font(.footnote).textSelection(.enabled)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(Color.secondary.opacity(0.08)))
                    ForEach(Array(d.extra.enumerated()), id: \.offset) { _, line in
                        Text("• \(line)").font(.caption).foregroundStyle(.secondary)
                    }
                    HStack {
                        ShareLink(item: d.reply) { Label("Copy or send reply", systemImage: "square.and.arrow.up") }.buttonStyle(.borderedProminent)
                        if let url = URL(string: d.link) { Link("Open My Self Serve", destination: url).buttonStyle(.bordered) }
                        if let tel = URL(string: "tel:" + d.phone.filter { !$0.isWhitespace }) { Link("Call", destination: tel).buttonStyle(.bordered) }
                    }
                    .font(.footnote)
                    Text(d.note).font(.caption2).foregroundStyle(.secondary)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
            }
        }
    }
}
