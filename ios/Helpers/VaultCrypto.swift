import Foundation
import CryptoKit
import CommonCrypto

// Talli document vault crypto. Same format as web/js/vault.js:
// byte 1, a 12 byte nonce, then AES-256-GCM ciphertext and tag. The key is
// PBKDF2-HMAC-SHA256 over the passphrase (NFC, UTF-8) and the vault's salt.
// tools/test-vault.js pins a vector that this code opens byte for byte.
enum VaultCrypto {
    static let iterations = 600_000

    enum Failure: Error { case notAVaultFile, keyDerivation }

    static func randomBytes(_ count: Int) -> Data {
        Data((0..<count).map { _ in UInt8.random(in: .min ... .max) })
    }

    static func deriveKey(passphrase: String, salt: Data) throws -> SymmetricKey {
        let pass = Array(passphrase.precomposedStringWithCanonicalMapping.utf8)
        var key = [UInt8](repeating: 0, count: 32)
        let status = salt.withUnsafeBytes { s in
            CCKeyDerivationPBKDF(
                CCPBKDFAlgorithm(kCCPBKDF2), pass.map { Int8(bitPattern: $0) }, pass.count,
                s.bindMemory(to: UInt8.self).baseAddress, salt.count,
                CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), UInt32(iterations), &key, key.count
            )
        }
        guard status == kCCSuccess else { throw Failure.keyDerivation }
        return SymmetricKey(data: key)
    }

    static func seal(_ data: Data, key: SymmetricKey) throws -> Data {
        guard let combined = try AES.GCM.seal(data, using: key).combined else { throw Failure.notAVaultFile }
        return Data([1]) + combined
    }

    /// Throws on a wrong key or any tampering.
    static func open(_ data: Data, key: SymmetricKey) throws -> Data {
        guard data.count >= 29, data.first == 1 else { throw Failure.notAVaultFile }
        return try AES.GCM.open(AES.GCM.SealedBox(combined: data.dropFirst()), using: key)
    }
}
