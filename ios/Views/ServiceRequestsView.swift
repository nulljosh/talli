import SwiftUI

// Service requests, shared by iPhone and Mac. The catalogue (words to say, papers to
// have ready, where to go) is src/programs/requests.js via /api/requests.
struct ServiceRequests: Codable, Sendable {
    struct Request: Codable, Sendable, Identifiable {
        let id: String
        let name: String
        let when: String
        let ready: [String]
        let say: String
        let note: String
        let phone: String
        let link: String
    }
    let requests: [Request]
}

struct ServiceRequestsView: View {
    let fetch: () async throws -> ServiceRequests

    @State private var requests: [ServiceRequests.Request] = []
    @State private var open: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Pick what you need. Talli gives you the words, the papers to have ready, and the way in.")
                .font(.footnote).foregroundStyle(.secondary)
            ForEach(requests) { r in
                VStack(alignment: .leading, spacing: 8) {
                    Button { withAnimation(.easeOut(duration: 0.2)) { open = open == r.id ? nil : r.id } } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.name).font(.subheadline.weight(.semibold))
                            Text(r.when).font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    if open == r.id {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("HAVE READY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                            ForEach(Array(r.ready.enumerated()), id: \.offset) { _, line in Text("• \(line)").font(.footnote).foregroundStyle(.secondary) }
                            VStack(alignment: .leading, spacing: 4) {
                                Text("WHAT TO SAY").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary).ltrTracking(1)
                                Text(r.say).font(.footnote).textSelection(.enabled)
                                ShareLink(item: r.say) { Label("Copy or send", systemImage: "square.and.arrow.up") }.font(.caption)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.25)))
                            Text(r.note).font(.caption).foregroundStyle(.secondary)
                            HStack {
                                if let tel = URL(string: "tel:" + r.phone.filter { !$0.isWhitespace }) { Link("Call \(r.phone)", destination: tel).buttonStyle(.borderedProminent) }
                                if let url = URL(string: r.link) { Link("Open the page", destination: url).buttonStyle(.bordered) }
                            }
                            .font(.footnote)
                        }
                    }
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
            }
        }
        .task { requests = (try? await fetch())?.requests ?? [] }
    }
}
