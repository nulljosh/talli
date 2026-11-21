import SwiftUI

// ponytail: one helper, not a glass design system.
// Liquid Glass on 26+; the pre-26 material is the fallback. Floating controls only:
// cards and list fills stay material on purpose. The 26-only symbols sit behind
// `#if compiler(>=6.2)` so Xcode 15 (macOS 13, the Ventura builds) only sees the fallback.
// Same file in ios/ and macos/.
extension View {
    @ViewBuilder
    func liquidGlass(in shape: some Shape,
                     interactive: Bool = false,
                     fallback: Material = .regularMaterial) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            self.glassEffect(interactive ? .regular.interactive() : .regular, in: shape)
        } else {
            self.background(fallback, in: shape)
        }
        #else
        self.background(fallback, in: shape)
        #endif
    }

    /// The one action style: a 48 point capsule. Liquid Glass on 26+, the bordered styles before.
    @ViewBuilder
    func capsuleAction(prominent: Bool = true) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26, macOS 26, *) {
            if prominent {
                capsuleShaped().controlSize(.large).buttonStyle(.glassProminent)
            } else {
                capsuleShaped().controlSize(.large).buttonStyle(.glass)
            }
        } else {
            borderedCapsule(prominent)
        }
        #else
        borderedCapsule(prominent)
        #endif
    }

    /// `ButtonBorderShape.capsule` is macOS 14+; Ventura keeps the default rounded shape.
    @ViewBuilder
    private func capsuleShaped() -> some View {
        if #available(iOS 15, macOS 14, *) { self.buttonBorderShape(.capsule) } else { self }
    }

    @ViewBuilder
    private func borderedCapsule(_ prominent: Bool) -> some View {
        if prominent {
            capsuleShaped().controlSize(.large).buttonStyle(.borderedProminent)
        } else {
            capsuleShaped().controlSize(.large).buttonStyle(.bordered)
        }
    }
}
