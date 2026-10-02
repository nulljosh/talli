import SwiftUI
import UserNotifications

@main
struct TalliApp: App {
    @State private var appState = AppState()
    @AppStorage("app_theme") private var rawTheme = "system"

    init() {
        UNUserNotificationCenter.current().delegate = NotificationActions.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .preferredColorScheme(rawTheme == "dark" ? .dark : rawTheme == "light" ? .light : nil)
                .overlay { WhatsNewSheet() }
        }
    }
}
