import SwiftUI

// Letter spacing tears apart joined scripts (Arabic, Farsi), so it only applies left to right,
// and drops at accessibility text sizes so big labels fit instead of truncating.
private struct LTRTracking: ViewModifier {
    @Environment(\.layoutDirection) private var direction
    @Environment(\.dynamicTypeSize) private var size
    let amount: CGFloat
    func body(content: Content) -> some View {
        content.tracking(direction == .rightToLeft || size.isAccessibilitySize ? 0 : amount)
    }
}

extension View {
    func ltrTracking(_ amount: CGFloat) -> some View { modifier(LTRTracking(amount: amount)) }
}
