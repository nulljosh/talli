import SwiftUI

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 88, height: 88)

            Text("Tally")
                .font(.system(size: 38, weight: .bold))
                .foregroundStyle(.primary)

            Text("Your benefits. No bureaucracy.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "1a1612"))
        .preferredColorScheme(.dark)
    }
}

#Preview {
    SplashView()
}
