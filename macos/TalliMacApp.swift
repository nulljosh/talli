import SwiftUI

@main
struct TalliMacApp: App {
    @StateObject private var appState = MacAppState()
    @AppStorage("app_theme") private var rawTheme = "system"
    /// UI tests pick light or dark through the environment; AppleInterfaceStyle does not reach SwiftUI.
    private var theme: String { ProcessInfo.processInfo.environment["UITEST_APPEARANCE"] ?? rawTheme }

    var body: some Scene {
        WindowGroup {
            MacContentView()
                .environmentObject(appState)
                .preferredColorScheme(theme == "dark" ? .dark : theme == "light" ? .light : nil)
                .task {
                    guard !(ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] != nil) else { return }
                    await appState.bootstrap()
                }
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 900, height: 640)

        MenuBarExtra("Talli", systemImage: "chart.bar.doc.horizontal") {
            MenuBarView()
                .environmentObject(appState)
        }
    }
}
