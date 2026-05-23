import SwiftUI

// Minimal color extensions used across views
extension Color {
    static let appleBlue = Color(red: 0, green: 0.44, blue: 0.89)
    static let gradeGreen = Color.green
    static let gradeRed = Color.red
    static let gradeAmber = Color.orange

    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        self.init(red: Double((rgb >> 16) & 0xFF) / 255, green: Double((rgb >> 8) & 0xFF) / 255, blue: Double(rgb & 0xFF) / 255)
    }
}

// Glass card modifier
extension View {
    func glassCard() -> some View {
        self
            .padding()
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(.ultraThinMaterial))
    }

    func accentGlassCard() -> some View {
        self
            .padding()
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(.ultraThinMaterial))
    }

    func sectionLabel() -> some View {
        self
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.5)
            .textCase(.uppercase)
            .foregroundStyle(.secondary)
    }
}

extension Animation {
    static let tallySpring = Animation.spring(response: 0.35, dampingFraction: 0.85)
}
