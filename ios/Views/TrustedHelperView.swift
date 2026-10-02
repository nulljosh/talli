import SwiftUI

// Trusted helper, shared by iPhone and Mac: a revocable read-only link for a
// caseworker, advocate or family member. Rules and the public page live on the
// server (src/programs/helper.js, web/helper.html).
struct TrustedHelpers: Codable, Sendable {
    struct Helper: Codable, Sendable, Identifiable {
        let id: String
        let name: String
        let createdAt: String
        let expiresAt: String
    }
    let helpers: [Helper]
    let ttlDays: Int
    let max: Int
}

struct NewHelper: Codable, Sendable {
    let id: String
    let name: String
    let expiresAt: String
    let path: String
}

struct HelperRequest: Codable, Sendable { let name: String }

struct TrustedHelperAPI: Sendable {
    let list: @Sendable () async throws -> TrustedHelpers
    let create: @Sendable (_ name: String) async throws -> NewHelper
    let remove: @Sendable (_ id: String) async throws -> Void
}

struct TrustedHelperView: View {
    let api: TrustedHelperAPI
    /// Where the helper page lives; the token path is appended to it.
    var origin = "https://talli.heyitsmejosh.com"

    @State private var data: TrustedHelpers?
    @State private var name = ""
    @State private var link: (name: String, url: String)?
    @State private var notice = ""

    var body: some View {
        Group {
            if let data { content(data) } else { ProgressView().frame(maxWidth: .infinity) }
        }
        .task { data = try? await api.list() }
    }

    private func content(_ d: TrustedHelpers) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Give a caseworker, advocate or family member a link. They see your next payment date, your monthly amount, your application status and whether your report is filed. Nothing else: no messages, no documents, no rent, no ID.")
                .font(.footnote).foregroundStyle(.secondary)
            ForEach(d.helpers) { h in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(h.name).font(.subheadline.weight(.semibold))
                        Text("Link works until \(h.expiresAt)").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Remove access") {
                        Task { try? await api.remove(h.id); link = nil; data = try? await api.list() }
                    }
                    .font(.footnote)
                }
                Divider()
            }
            if let link {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Link for \(link.name)").font(.subheadline.weight(.bold))
                    Text("This is the only time you will see it. Anyone with the link can see what is listed above until you remove it.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text(link.url).font(.caption).textSelection(.enabled)
                    if let url = URL(string: link.url) {
                        ShareLink(item: url) { Label("Copy or send the link", systemImage: "square.and.arrow.up") }.buttonStyle(.borderedProminent)
                    }
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.accentColor.opacity(0.08)))
            }
            if d.helpers.count < d.max {
                HStack {
                    TextField("Who is it for? (Sam, advocate)", text: $name).textFieldStyle(.roundedBorder)
                    Button("Create link") {
                        let who = name.trimmingCharacters(in: .whitespaces)
                        Task {
                            do {
                                let made = try await api.create(who)
                                link = (made.name, origin + made.path)
                                name = ""; notice = ""
                                data = try? await api.list()
                            } catch { notice = "Something went wrong. Try again." }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            if !notice.isEmpty { Text(notice).font(.footnote.weight(.semibold)).foregroundStyle(.orange) }
            Text("Links stop working after \(d.ttlDays) days. You can share with up to \(d.max) people.").font(.caption2).foregroundStyle(.secondary)
        }
    }
}
