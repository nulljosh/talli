import SwiftUI

// Letter spacing tears apart joined scripts (Arabic, Farsi), so it only applies left to right.
private struct LTRTracking: ViewModifier {
    @Environment(\.layoutDirection) private var direction
    let amount: CGFloat
    func body(content: Content) -> some View {
        content.tracking(direction == .rightToLeft ? 0 : amount)
    }
}

extension View {
    func ltrTracking(_ amount: CGFloat) -> some View { modifier(LTRTracking(amount: amount)) }
}
