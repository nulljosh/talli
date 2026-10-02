import SwiftUI

@main
struct TalliMacApp: App {
    @State private var appState = MacAppState()
    @AppStorage("app_theme") private var rawTheme = "system"
    private static let isSnapshot = CommandLine.arguments.contains("UITEST_SNAPSHOT")

    var body: some Scene {
        WindowGroup {
            MacContentView()
                .environment(appState)
                .preferredColorScheme(rawTheme == "dark" ? .dark : rawTheme == "light" ? .light : nil)
                .task {
                    guard !CommandLine.arguments.contains("UITEST_SNAPSHOT") else { return }
                    await appState.bootstrap()
                }
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        // Store shots need 16:10 at 1280x800; everyone else gets the compact window.
        .defaultSize(width: Self.isSnapshot ? 1280 : 900, height: Self.isSnapshot ? 800 : 640)

        MenuBarExtra("Talli", systemImage: "chart.bar.doc.horizontal") {
            MenuBarView()
                .environment(appState)
        }
    }
}
