import SwiftUI

@main
struct TalliWatchApp: App {
    init() { PhoneSync.shared.start() }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
