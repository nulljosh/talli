import SwiftUI
#if canImport(UIKit)
import UIKit
private typealias PlatformFont = UIFont
#else
import AppKit
private typealias PlatformFont = NSFont
#endif

/// The Home amount in the system font, bold, shared by iPhone and Mac. (It was Talli Display, a renamed Barlow
/// Condensed, which read as stretched; Joshua asked for a font that matches the rest, 2026-11-01.) Same rule as the web hero: the figures keep the font's own proportions, as tall as `maxHeight` or
/// as wide as `width` allows, never stretched (big-number heroes are set this way). The $ is half size, green, raised to
/// the top of the figures, the way prices are set. It breathes slowly unless Reduce Motion is on.
struct HeroAmountView: View {
    let digits: String
    let width: CGFloat
    let maxHeight: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static func face(_ size: CGFloat) -> PlatformFont { PlatformFont.systemFont(ofSize: size, weight: .bold) }
    // Font units per 1000, read from the system font: its ascent, the top of the figures (cap height), the foot of the
    // comma, the $ top; then the stretch limit (never stretched) and the gap after the $.
    private static let ascent: CGFloat = face(1000).ascender
    private static let top: CGFloat = face(1000).capHeight
    private static let box: CGFloat = top + 150, dollarTop: CGFloat = top + 60
    private static let maxStretch: CGFloat = 1, dollarScale: CGFloat = 0.5, gap: CGFloat = 36
    /// Room on each side so the figures never run to the screen edge (points, same 24 as the web).
    static let inset: CGFloat = 24

    /// Width of `text` in font units at 1000 points.
    private static func units(_ text: String, size: CGFloat = 1000) -> CGFloat {
        return (text as NSString).size(withAttributes: [.font: face(size)]).width
    }

    /// Point size and vertical stretch for this box.
    static func layout(digits: String, width: CGFloat, maxHeight: CGFloat) -> (size: CGFloat, stretch: CGFloat) {
        let natural = units("$", size: 1000 * dollarScale) + gap + units(digits)
        let byHeight = maxHeight / box * 1000
        let byWidth = max(0, width - 2 * inset) / natural * 1000
        if byHeight <= byWidth { return (byHeight, 1) }
        return (byWidth, min(byHeight / byWidth, maxStretch))
    }

    var body: some View {
        let (size, stretch) = Self.layout(digits: digits, width: width, maxHeight: maxHeight)
        let u = size / 1000
        HStack(alignment: .firstTextBaseline, spacing: Self.gap * u) {
            Text("$")
                .font(.system(size: size * Self.dollarScale, weight: .bold))
                .foregroundStyle(Color.green)
                .baselineOffset((Self.top - Self.dollarTop * Self.dollarScale) * u)
            Text(digits)
                .font(.system(size: size, weight: .bold))
                .contentTransition(.numericText())
        }
        .fixedSize()
        // The text box starts at the font's ascent; lift it so the figures' tops meet the frame's top.
        .offset(y: -(Self.ascent - Self.top) * u)
        .scaleEffect(x: 1, y: stretch, anchor: .top)
        .frame(height: Self.box * u * stretch, alignment: .top)
        .phaseAnimator(reduceMotion ? [false] : [false, true]) { view, inhale in
            view.scaleEffect(inhale ? 1.025 : 1).opacity(inhale ? 0.88 : 1)
        } animation: { _ in .easeInOut(duration: 3) }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("$" + digits)
    }
}
