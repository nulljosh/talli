import SwiftUI

@main
struct SchoolApp: App {
    var body: some Scene {
        WindowGroup {
            SplashView()
                .preferredColorScheme(.dark)
        }
    }
}
