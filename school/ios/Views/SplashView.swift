import SwiftUI

struct SplashView: View {
    @State private var isActive = false
    @State private var scale: CGFloat = 0.8
    @State private var opacity: Double = 0

    var body: some View {
        if isActive {
            ContentView()
        } else {
            ZStack {
                Color(red: 17/255, green: 17/255, blue: 17/255)
                    .ignoresSafeArea()

                VStack(spacing: 20) {
                    Image(systemName: "graduationcap.fill")
                        .font(.system(size: 80))
                        .foregroundColor(Color(red: 22/255, green: 163/255, blue: 74/255))
                        .scaleEffect(scale)
                        .opacity(opacity)

                    Text("School")
                        .font(.system(size: 32, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .opacity(opacity)

                    Text("Langley SD35")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(Color.white.opacity(0.4))
                        .opacity(opacity)
                }
            }
            .onAppear {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    scale = 1.0
                    opacity = 1.0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        isActive = true
                    }
                }
            }
        }
    }
}
