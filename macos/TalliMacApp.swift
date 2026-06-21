import SwiftUI

@main
struct TalliMacApp: App {
    @State private var appState = MacAppState()

    var body: some Scene {
        WindowGroup {
            MacContentView()
                .environment(appState)
                .preferredColorScheme(.dark)
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
