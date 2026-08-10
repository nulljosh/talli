import SwiftUI

// Minimal color extensions used across views
extension Color {
    static let appleBlue = Color(red: 0, green: 0.44, blue: 0.89)
    static let talliOrange = Color(hex: "5B9BD5")
    static let gradeRed = Color.red

    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        self.init(red: Double((rgb >> 16) & 0xFF) / 255, green: Double((rgb >> 8) & 0xFF) / 255, blue: Double(rgb & 0xFF) / 255)
    }
}

extension UIColor {
    convenience init(hex: String) {
        let scanner = Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")))
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        self.init(
            red:   CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8)  & 0xFF) / 255,
            blue:  CGFloat( rgb        & 0xFF) / 255,
            alpha: 1
        )
    }
}

// Card modifier — solid grouped background (no blur artifact)
extension View {
    func sectionLabel() -> some View {
        self
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.5)
            .textCase(.uppercase)
            .foregroundStyle(.secondary)
    }
}
