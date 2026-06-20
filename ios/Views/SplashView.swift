import SwiftUI

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 88, height: 88)

            Text("Talli")
                .font(.custom("Fraunces-9ptBlack", size: 38))
                .foregroundStyle(.primary)

            Text("Your benefits. No bureaucracy.")
                .font(.custom("DMSans-9ptRegular", size: 15))
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
