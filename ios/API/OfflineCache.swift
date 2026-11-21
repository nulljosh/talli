import Foundation

// ponytail: the last good GET body per API path on disk, so a screen opened with no
// network shows what it showed last time instead of an error. One file per path in
// Caches, wiped on sign-out. Shared by iPhone and Mac (macos/project.yml).
enum OfflineCache {
    // ponytail: var only so the self-check can point it at a temp folder.
    #if compiler(>=5.10)
    nonisolated(unsafe) static var directory: URL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("talli-offline", isDirectory: true)
    #else // Xcode 15 (macOS 13) builds
    static var directory: URL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("talli-offline", isDirectory: true)
    #endif

    /// Only reads are kept, and never anything that carries a token.
    static func file(for request: URLRequest) -> URL? {
        guard (request.httpMethod ?? "GET") == "GET", let path = request.url?.path,
              !path.isEmpty, !path.contains("token") else { return nil }
        return directory.appendingPathComponent(path.replacingOccurrences(of: "/", with: "_") + ".json")
    }

    static func save(_ data: Data, for request: URLRequest) {
        guard let url = file(for: request) else { return }
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
    }

    static func load(for request: URLRequest) -> Data? {
        file(for: request).flatMap { try? Data(contentsOf: $0) }
    }

    static func clear() {
        try? FileManager.default.removeItem(at: directory)
    }
}
