import Foundation

/// Shared formatting/validation for the report identity fields (SIN, phone, PIN).
/// Lives here because the fields are edited in Settings but consumed by ReportView.
enum PersonalInfo {
    static func digitsOnly(_ value: String, maxCount: Int) -> String {
        String(value.filter(\.isNumber).prefix(maxCount))
    }

    static func formatPhone(_ value: String) -> String {
        let digits = digitsOnly(value, maxCount: 10)

        if digits.count <= 3 {
            return digits
        }
        if digits.count <= 6 {
            let area = digits.prefix(3)
            let rest = digits.dropFirst(3)
            return "(\(area)) \(rest)"
        }

        let area = digits.prefix(3)
        let mid = digits.dropFirst(3).prefix(3)
        let last = digits.dropFirst(6)
        return "(\(area)) \(mid)-\(last)"
    }

    static func isComplete(sin: String, phone: String, pin: String) -> Bool {
        sin.count == 9 && digitsOnly(phone, maxCount: 10).count == 10 && !pin.isEmpty
    }
}
