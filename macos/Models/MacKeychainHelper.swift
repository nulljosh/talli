import Foundation
import Security

enum MacKeychainHelper {
    struct Credentials {
        let username: String
        let password: String
    }

    private static let service = "com.jt.tally.mac"
    private static let usernameKey = "tally-mac-username"
    private static let passwordKey = "tally-mac-password"

    static func saveCredentials(username: String, password: String) {
        save(key: usernameKey, value: username)
        save(key: passwordKey, value: password)
    }

    static func loadCredentials() -> Credentials? {
        guard let username = load(key: usernameKey),
              let password = load(key: passwordKey) else { return nil }
        return Credentials(username: username, password: password)
    }

    static func clearCredentials() {
        delete(key: usernameKey)
        delete(key: passwordKey)
    }

    private static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        delete(key: key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
