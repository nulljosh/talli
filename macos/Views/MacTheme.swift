import SwiftUI

// BC Government Blue Palette
extension Color {
    /// #003366 - BC Gov primary dark blue
    static let bcPrimary = Color(red: 0/255, green: 51/255, blue: 102/255)
    /// #1A5276 - BC Gov medium blue
    static let bcMedium = Color(red: 26/255, green: 82/255, blue: 118/255)
    /// #38B0DE - BC Gov light accent blue
    static let bcLight = Color(red: 56/255, green: 176/255, blue: 222/255)
}

// MARK: - Shared Card Modifiers

private let macCardShape = RoundedRectangle(cornerRadius: 16, style: .continuous)

struct MacGlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                macCardShape
                    .fill(.ultraThinMaterial)
                    .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
            )
    }
}

extension View {
    func macGlassCard() -> some View { modifier(MacGlassCard()) }
}
