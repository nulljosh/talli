import SwiftUI
import UniformTypeIdentifiers
import CryptoKit

// Document vault, shared by iPhone and Mac. Files are encrypted on this device
// (VaultCrypto) and the server only stores ciphertext. Same format as the web.
struct VaultMeta: Codable, Sendable {
    let salt: String?
    let index: String?
    let count: Int
}

struct VaultFile: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let type: String?
    let category: String
    let size: Int
    let added: String
}

private struct VaultIndex: Codable { var files: [VaultFile] }
private struct VaultMetaBody: Encodable { let salt: String?; let index: String }

/// Five calls, built from one raw request function so both app clients share the code.
struct VaultAPI: Sendable {
    typealias Request = @Sendable (_ path: String, _ method: String, _ body: Data?, _ contentType: String) async throws -> Data
    let request: Request

    func meta() async throws -> VaultMeta {
        try JSONDecoder().decode(VaultMeta.self, from: await request("api/vault", "GET", nil, "application/json"))
    }
    func putMeta(salt: String?, index: String) async throws {
        _ = try await request("api/vault/meta", "PUT", JSONEncoder().encode(VaultMetaBody(salt: salt, index: index)), "application/json")
    }
    func putDoc(_ id: String, _ data: Data) async throws {
        _ = try await request("api/vault/doc/\(id)", "PUT", data, "application/octet-stream")
    }
    func getDoc(_ id: String) async throws -> Data {
        try await request("api/vault/doc/\(id)", "GET", nil, "application/json")
    }
    func deleteDoc(_ id: String) async throws {
        _ = try await request("api/vault/doc/\(id)", "DELETE", nil, "application/json")
    }
}

private let vaultCategories = [("pwd", "PWD letter"), ("medical", "Medical report"), ("id", "ID"), ("lease", "Lease"), ("other", "Other")]
private let vaultMaxBytes = 5 * 1024 * 1024

struct VaultView: View {
    let api: VaultAPI

    @State private var meta: VaultMeta?
    @State private var key: SymmetricKey?
    @State private var files: [VaultFile] = []
    @State private var pass = ""
    @State private var pass2 = ""
    @State private var category = "pwd"
    @State private var busy = false
    @State private var notice = ""
    @State private var importing = false
    @State private var ready: [String: URL] = [:]

    var body: some View {
        Group {
            if let meta {
                if meta.salt == nil { create } else if key == nil { locked(meta) } else { unlocked }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .task { meta = try? await api.meta() }
    }

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.secondary.opacity(0.2)))
    }

    private var errorLine: some View {
        Group { if !notice.isEmpty { Text(notice).font(.footnote.weight(.semibold)).foregroundStyle(.orange) } }
    }

    // MARK: States

    private var create: some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Keep your papers safe").font(.headline)
                Text("Your PWD letter, medical report, ID and lease. Files are locked on this device with a passphrase before they are saved. Talli only holds the locked copy and cannot read it.")
                    .font(.footnote).foregroundStyle(.secondary)
                SecureField("Choose a passphrase", text: $pass).textFieldStyle(.roundedBorder)
                SecureField("Type it again", text: $pass2).textFieldStyle(.roundedBorder)
                Text("If you forget the passphrase, nobody can get your files back. Write it down somewhere safe.")
                    .font(.caption.weight(.semibold)).foregroundStyle(.orange)
                Button("Create vault") { run { try await createVault() } }
                    .buttonStyle(.borderedProminent)
                    .disabled(busy || pass.count < 8 || pass != pass2)
                errorLine
            }
        }
    }

    private func locked(_ meta: VaultMeta) -> some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Locked").font(.headline)
                SecureField("Your passphrase", text: $pass).textFieldStyle(.roundedBorder)
                    .onSubmit { run { try await unlock(meta) } }
                Button(busy ? "Unlocking..." : "Unlock") { run { try await unlock(meta) } }
                    .buttonStyle(.borderedProminent)
                    .disabled(busy || pass.isEmpty)
                errorLine
            }
        }
    }

    private var unlocked: some View {
        card {
            VStack(alignment: .leading, spacing: 10) {
                if files.isEmpty {
                    Text("Nothing here yet. Add your PWD letter, medical report, ID or lease.").font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(files) { f in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(f.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                                Text("\(vaultCategories.first { $0.0 == f.category }?.1 ?? "Other") · \(ByteCountFormatter.string(fromByteCount: Int64(f.size), countStyle: .file))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let url = ready[f.id] {
                                ShareLink(item: url) { Label("Share", systemImage: "square.and.arrow.up") }.font(.footnote)
                            } else {
                                Button("Open") { run { try await openFile(f) } }.font(.footnote).disabled(busy)
                            }
                            Button { run { try await remove(f) } } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                                .buttonStyle(.plain).disabled(busy).accessibilityLabel("Delete")
                        }
                        Divider()
                    }
                }
                HStack {
                    Picker("Type", selection: $category) {
                        ForEach(vaultCategories, id: \.0) { Text(LocalizedStringKey($0.1)).tag($0.0) }
                    }
                    .labelsHidden()
                    Button(busy ? "Working..." : "Add a document") { importing = true }
                        .buttonStyle(.borderedProminent)
                        .disabled(busy || files.count >= 40)
                }
                errorLine
            }
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.item]) { result in
            if case .success(let url) = result { run { try await add(url) } }
        }
    }

    // MARK: Actions

    private func run(_ work: @escaping () async throws -> Void) {
        Task {
            busy = true; notice = ""
            do { try await work() } catch let e as VaultMessage { notice = e.text } catch { notice = "Something went wrong. Try again." }
            busy = false
        }
    }

    private struct VaultMessage: Error { let text: String }

    private func putIndex(_ k: SymmetricKey, _ list: [VaultFile], salt: String?) async throws {
        let sealed = try VaultCrypto.seal(JSONEncoder().encode(VaultIndex(files: list)), key: k)
        try await api.putMeta(salt: salt, index: sealed.base64EncodedString())
        meta = try? await api.meta()
    }

    private func derive(_ salt: Data) async throws -> SymmetricKey {
        let phrase = pass
        return try await Task.detached { try VaultCrypto.deriveKey(passphrase: phrase, salt: salt) }.value
    }

    private func createVault() async throws {
        let salt = VaultCrypto.randomBytes(16)
        let k = try await derive(salt)
        try await putIndex(k, [], salt: salt.base64EncodedString())
        key = k; files = []; pass = ""; pass2 = ""
    }

    private func unlock(_ meta: VaultMeta) async throws {
        guard let saltText = meta.salt, let salt = Data(base64Encoded: saltText) else { throw VaultMessage(text: "Something went wrong. Try again.") }
        let k = try await derive(salt)
        var list: [VaultFile] = []
        if let index = meta.index, let bytes = Data(base64Encoded: index) {
            guard let plain = try? VaultCrypto.open(bytes, key: k), let decoded = try? JSONDecoder().decode(VaultIndex.self, from: plain) else {
                throw VaultMessage(text: "That passphrase does not open this vault.")
            }
            list = decoded.files
        }
        key = k; files = list; pass = ""
    }

    private func add(_ url: URL) async throws {
        guard let key else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        guard data.count <= vaultMaxBytes else { throw VaultMessage(text: "Files can be up to 5 MB.") }
        let id = VaultCrypto.randomBytes(16).map { String(format: "%02x", $0) }.joined()
        try await api.putDoc(id, VaultCrypto.seal(data, key: key))
        let type = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
        let list = files + [VaultFile(id: id, name: url.lastPathComponent, type: type, category: category, size: data.count, added: ISO8601DateFormatter().string(from: Date()))]
        try await putIndex(key, list, salt: nil)
        files = list
    }

    /// Decrypts into a temporary file so the system share sheet can attach it anywhere.
    private func openFile(_ f: VaultFile) async throws {
        guard let key else { return }
        let plain = try VaultCrypto.open(await api.getDoc(f.id), key: key)
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("talli-vault", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(f.name)
        try plain.write(to: url, options: .completeFileProtection)
        ready[f.id] = url
    }

    private func remove(_ f: VaultFile) async throws {
        guard let key else { return }
        try await api.deleteDoc(f.id)
        if let url = ready[f.id] { try? FileManager.default.removeItem(at: url) }
        ready[f.id] = nil
        let list = files.filter { $0.id != f.id }
        try await putIndex(key, list, salt: nil)
        files = list
    }
}
