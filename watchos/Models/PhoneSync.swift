import Foundation
import WatchConnectivity

extension Notification.Name {
    static let talliTokenChanged = Notification.Name("talliTokenChanged")
}

/// Receives the signed-in account's token from the iPhone app.
final class PhoneSync: NSObject, WCSessionDelegate, @unchecked Sendable {
    static let shared = PhoneSync()

    func start() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        apply(context)
    }

    private func apply(_ context: [String: Any]) {
        guard let token = context["api_token"] as? String, !token.isEmpty,
              token != WatchAPI.shared.apiToken else { return }
        WatchAPI.shared.apiToken = token
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .talliTokenChanged, object: nil)
        }
    }
}
