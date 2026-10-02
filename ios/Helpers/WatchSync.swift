import Foundation
import WatchConnectivity

/// Hands the signed-in account's widget token to the paired Watch, so the Watch
/// reads this account's summary instead of needing its own sign-in.
final class WatchSync: NSObject, WCSessionDelegate, @unchecked Sendable {
    static let shared = WatchSync()
    private var pendingToken: String?

    func send(token: String) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        if session.activationState == .activated {
            try? session.updateApplicationContext(["api_token": token])
        } else {
            pendingToken = token
            session.delegate = self
            session.activate()
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        guard state == .activated, let token = pendingToken else { return }
        pendingToken = nil
        try? session.updateApplicationContext(["api_token": token])
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}
