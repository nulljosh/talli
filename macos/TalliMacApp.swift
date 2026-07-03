import SwiftUI

@main
struct TalliMacApp: App {
    @State private var appState = MacAppState()
    @AppStorage("app_theme") private var rawTheme = "dark"

    var body: some Scene {
        WindowGroup {
            MacContentView()
                .environment(appState)
                .preferredColorScheme(rawTheme == "dark" ? .dark : rawTheme == "light" ? .light : nil)
                .task {
                    await appState.bootstrap()
                }
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 900, height: 640)

        MenuBarExtra("Talli", systemImage: "chart.bar.doc.horizontal") {
            MenuBarView()
                .environment(appState)
        }
    }
}
