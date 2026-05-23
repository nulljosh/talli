import Contacts
import Foundation

enum ContactsManagerError: Error, LocalizedError {
    case accessDenied
    case accessRestricted
    case fetchFailed(Error)
    case unknown

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "Contacts access denied. Enable it in Settings > Privacy > Contacts."
        case .accessRestricted:
            return "Contacts access is restricted on this device."
        case .fetchFailed(let error):
            return "Failed to fetch contacts: \(error.localizedDescription)"
        case .unknown:
            return "An unknown error occurred accessing contacts."
        }
    }
}

struct ImportedContact: Identifiable, Codable, Sendable {
    let id: String
    let givenName: String
    let familyName: String
    let phoneNumbers: [String]
    let emailAddresses: [String]

    var fullName: String {
        [givenName, familyName].filter { !$0.isEmpty }.joined(separator: " ")
    }
}

final class ContactsManager: @unchecked Sendable {
    static let shared = ContactsManager()

    private let store = CNContactStore()

    private init() {}

    func requestAccess() async throws -> Bool {
        let status = CNContactStore.authorizationStatus(for: .contacts)

        switch status {
        case .authorized:
            return true
        case .denied:
            throw ContactsManagerError.accessDenied
        case .restricted:
            throw ContactsManagerError.accessRestricted
        case .notDetermined:
            do {
                let granted = try await store.requestAccess(for: .contacts)
                if !granted {
                    throw ContactsManagerError.accessDenied
                }
                return true
            } catch let error as ContactsManagerError {
                throw error
            } catch {
                throw ContactsManagerError.fetchFailed(error)
            }
        case .limited:
            return true
        @unknown default:
            throw ContactsManagerError.unknown
        }
    }

    func fetchAllContacts() async throws -> [ImportedContact] {
        _ = try await requestAccess()

        let keysToFetch: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor,
            CNContactIdentifierKey as CNKeyDescriptor
        ]

        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        request.sortOrder = .givenName

        var contacts: [ImportedContact] = []

        do {
            try store.enumerateContacts(with: request) { contact, _ in
                let phones = contact.phoneNumbers.map { $0.value.stringValue }
                let emails = contact.emailAddresses.map { String($0.value) }

                let imported = ImportedContact(
                    id: contact.identifier,
                    givenName: contact.givenName,
                    familyName: contact.familyName,
                    phoneNumbers: phones,
                    emailAddresses: emails
                )

                contacts.append(imported)
            }
        } catch {
            throw ContactsManagerError.fetchFailed(error)
        }

        return contacts
    }

    func searchContacts(query: String) async throws -> [ImportedContact] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return try await fetchAllContacts()
        }

        let allContacts = try await fetchAllContacts()
        let lowered = query.lowercased()

        return allContacts.filter { contact in
            contact.fullName.lowercased().contains(lowered)
                || contact.phoneNumbers.contains { $0.contains(query) }
                || contact.emailAddresses.contains { $0.lowercased().contains(lowered) }
        }
    }

    var isAuthorized: Bool {
        CNContactStore.authorizationStatus(for: .contacts) == .authorized
    }
}
