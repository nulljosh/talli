import SwiftUI
import UserNotifications

@main
@MainActor
struct TalliApp: App {
    @State private var appState = AppState()
    @AppStorage("app_theme") private var rawTheme = "system"
    @Environment(\.scenePhase) private var scenePhase

    init() {
        UNUserNotificationCenter.current().delegate = NotificationActions.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .preferredColorScheme(rawTheme == "dark" ? .dark : rawTheme == "light" ? .light : nil)
                .overlay { WhatsNewSheet() }
                .onChange(of: scenePhase, initial: true) { _, phase in
                    // "Open messages" (Siri, Spotlight, icon menu) leaves the tab for us here.
                    guard phase == .active, case let tab = UserDefaults.standard.integer(forKey: "pending-tab"), tab > 0 else { return }
                    UserDefaults.standard.removeObject(forKey: "pending-tab")
                    appState.selectedTabIndex = tab
                }
        }
    }
}
