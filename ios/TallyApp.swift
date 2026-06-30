import SwiftUI

@main
struct TalliApp: App {
    @State private var appState = AppState()
    @AppStorage("app_theme") private var rawTheme = "system"

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .preferredColorScheme(rawTheme == "dark" ? .dark : rawTheme == "light" ? .light : nil)
        }
    }
}
