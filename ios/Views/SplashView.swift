import SwiftUI

struct SplashView: View {
    var body: some View {
        VStack(spacing: 20) {
            // Sized against the container rather than a fixed 88pt so the mark
            // actually fills the screen instead of floating in the middle third.
            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .containerRelativeFrame(.horizontal) { width, _ in width * 0.42 }

            Text("Talli")
                .font(.system(size: 44, weight: .bold))
                .foregroundStyle(.primary)

            Text("Your benefits. No bureaucracy.")
                .font(.system(size: 17))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .containerRelativeFrame(.horizontal) { width, _ in width * 0.8 }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview {
    SplashView()
}
