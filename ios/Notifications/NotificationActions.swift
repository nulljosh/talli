import UserNotifications
import Foundation

@MainActor
final class NotificationActions: NSObject, @preconcurrency UNUserNotificationCenterDelegate {
    static let shared = NotificationActions()

    private override init() {
        super.init()
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        guard response.actionIdentifier == "FILE_REPORT" else {
            completionHandler()
            return
        }

        Task {
            await handleFileReportAction(center: center)
            completionHandler()
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    private func handleFileReportAction(center: UNUserNotificationCenter) async {
        let sin = KeychainHelper.loadReportSIN() ?? ""
        let phone = KeychainHelper.loadReportPhone() ?? ""
        let pin = KeychainHelper.loadReportPIN() ?? ""

        guard PersonalInfo.isComplete(sin: sin, phone: phone, pin: pin) else {
            postNotification(center: center, title: "Incomplete credentials", message: "Add your SIN, phone, and PIN in Settings before filing.")
            return
        }

        let request = ReportSubmissionRequest(
            sin: sin,
            phone: PersonalInfo.digitsOnly(phone, maxCount: 20),
            pin: pin,
            dryRun: false
        )

        do {
            let response = try await APIClient.shared.submitReport(request)

            if response.success ?? true {
                let submittedDate = Date()
                UserDefaults.standard.set(submittedDate, forKey: "report-last-submitted-at")
                KeychainHelper.saveReportSIN(sin)
                KeychainHelper.saveReportPIN(pin)
                KeychainHelper.saveReportPhone(phone)
                postNotification(center: center, title: "Report filed", message: response.message ?? "Your monthly report has been submitted.")
            } else {
                let errorMsg = response.error ?? response.message ?? "Submission failed."
                postNotification(center: center, title: "Couldn't file report", message: errorMsg)
            }
        } catch {
            postNotification(center: center, title: "Couldn't file report", message: error.localizedDescription)
        }
    }

    private func postNotification(center: UNUserNotificationCenter, title: String, message: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = message
        content.sound = .default

        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
        center.add(request) { _ in }
    }
}
