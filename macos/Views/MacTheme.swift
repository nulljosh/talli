import SwiftUI

// BC Government Blue Palette
extension Color {
    /// #003366 in light mode, brightened for legibility against dark backgrounds in dark mode
    static let bcPrimary = Color(NSColor(name: nil, dynamicProvider: { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(red: 92/255, green: 170/255, blue: 235/255, alpha: 1)
            : NSColor(red: 0/255, green: 51/255, blue: 102/255, alpha: 1)
    }))
    /// #1A5276 - BC Gov medium blue
    static let bcMedium = Color(red: 26/255, green: 82/255, blue: 118/255)
    /// #38B0DE - BC Gov light accent blue
    static let bcLight = Color(red: 56/255, green: 176/255, blue: 222/255)
}

// MARK: - Shared Card Modifiers

private let macCardShape = RoundedRectangle(cornerRadius: 16, style: .continuous)

struct MacGlassCard: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                macCardShape
                    .fill(colorScheme == .dark ? .regularMaterial : .ultraThinMaterial)
                    .shadow(color: .black.opacity(colorScheme == .dark ? 0.25 : 0.06), radius: 10, y: 3)
            )
            .overlay(
                macCardShape.strokeBorder(
                    Color.primary.opacity(colorScheme == .dark ? 0.12 : 0.05),
                    lineWidth: 1
                )
            )
    }
}

extension View {
    func macGlassCard() -> some View { modifier(MacGlassCard()) }
}
