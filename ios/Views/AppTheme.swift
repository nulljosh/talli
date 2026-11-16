import SwiftUI

// Minimal color extensions used across views
extension Color {
    static let appleBlue = Color(red: 0, green: 0.44, blue: 0.89)
    static let talliBlue = Color(hex: "5B9BD5")
    /// Brand blue for text and fills that need 4.5:1 against white (brand/tokens.css).
    static let talliBlueDeep = Color(hex: "2F6FB0")
    /// Link text: deep blue on light, brand blue on dark, so it reads at 4.5:1 either way.
    static let talliLink = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: "5B9BD5") : UIColor(hex: "2F6FB0") })
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
            .font(.caption2.weight(.semibold))
            .ltrTracking(1.5)
            .textCase(.uppercase)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}
