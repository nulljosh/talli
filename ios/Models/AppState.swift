import Foundation
import LocalAuthentication
import Network
import Observation

@Observable
@MainActor
final class AppState {
    private enum Constants {
        static let dashboardCacheKey = "cached-dashboard-data"
        static let lastSyncKey = "last-sync-date"
    }

    var isAuthenticated = false
    var isLoading = false
    var errorMessage: String?
    var dashboard: DashboardData?
    var isOffline = false
    var selectedTabIndex: Int = 0
    var lastSyncDate: Date? = nil
    var paidStatus: PaidStatus? = nil
    var readMessageIds: Set<String> = []

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.heyitsmejosh.tally.network")

    private var storedCredentials: KeychainHelper.Credentials?

    var username: String? {
        KeychainHelper.loadCredentials()?.username
    }

    init() {
        startNetworkMonitoring()
        dashboard = Self.loadCached(DashboardData.self, forKey: Constants.dashboardCacheKey)
        lastSyncDate = UserDefaults.standard.object(forKey: Constants.lastSyncKey) as? Date
        storedCredentials = KeychainHelper.loadCredentials()
    }

    deinit {
        monitor.cancel()
    }

    var paymentAmountText: String {
        dashboard?.paymentAmount ?? "$0.00"
    }

    var statusMessages: [String] {
        dashboard?.statusMessages.map(\.text) ?? []
    }

    var statusMessageItems: [DashboardData.StatusMessage] {
        dashboard?.statusMessages ?? []
    }

    var nextPaymentDateText: String {
        guard let date = parsedNextPaymentDate else { return "--" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }

    var parsedPaymentAmount: Double? {
        let raw = dashboard?.paymentAmount ?? ""
        let cleaned = raw.filter { $0.isNumber || $0 == "." }
        return Double(cleaned)
    }

    var countdownText: String {
        guard let date = parsedNextPaymentDate else { return "--" }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: date)
        let days = Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0

        if days < 0 {
            return "Payment date passed"
        }
        if days == 0 {
            return "Today"
        }
        return "\(days) day\(days == 1 ? "" : "s")"
    }

    var parsedNextPaymentDate: Date? {
        guard let raw = dashboard?.nextPaymentDate, !raw.isEmpty else { return nil }
        return DateParsing.parse(raw)
    }

    var unreadMessageCount: Int {
        let allIds = Set(statusMessageItems.map(\.id))
        return allIds.subtracting(readMessageIds).count
    }

    func loadReadMessages() async {
        guard isAuthenticated else { return }
        do {
            let data = try await APIClient.shared.getReadMessages()
            readMessageIds = Set(data.readIds)
        } catch {
            // Non-critical
        }
    }

    func markAllMessagesRead() async {
        let allIds = statusMessageItems.map(\.id)
        readMessageIds = Set(allIds)
        guard isAuthenticated else { return }
        do {
            _ = try await APIClient.shared.markMessagesRead(ids: allIds)
        } catch {
            // Non-critical
        }
    }

    var isPaid: Bool {
        paidStatus?.paid ?? false
    }

    var paidDateText: String? {
        guard let raw = paidStatus?.updatedAt, !raw.isEmpty,
              let date = DateParsing.parse(raw) else { return nil }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }

    func loadPaidStatus() async {
        guard isAuthenticated else { return }
        do {
            paidStatus = try await APIClient.shared.getPaidStatus()
        } catch {
            // Non-critical -- don't surface error
        }
    }

    func togglePaid() async {
        guard isAuthenticated else { return }
        let previous = paidStatus
        let newValue = !(paidStatus?.paid ?? false)
        paidStatus = PaidStatus(paid: newValue, month: previous?.month, updatedAt: newValue ? ISO8601DateFormatter().string(from: Date()) : nil)
        do {
            paidStatus = try await APIClient.shared.setPaidStatus(paid: newValue)
        } catch {
            paidStatus = previous
        }
    }

    func bootstrap() async {
        // Fast path: check if server session is still alive (no BC Self-Serve roundtrip)
        if let _ = storedCredentials {
            if let sessionValid = try? await APIClient.shared.sessionCheck(), sessionValid {
                isAuthenticated = true
                async let paidTask: Void = loadPaidStatus()
                async let readTask: Void = loadReadMessages()
                _ = await (paidTask, readTask)
                try? await loadLatestData()
                return
            }
        }

        // Slow path: full login against BC Self-Serve
        if let credentials = storedCredentials {
            storedCredentials = nil
            if biometricBiometryType() != .none {
                do {
                    try await authenticateWithBiometrics()
                    await login(username: credentials.username, password: credentials.password, storeCredentials: false)
                } catch let error as LAError where error.code == .userCancel || error.code == .systemCancel || error.code == .appCancel {
                    errorMessage = nil
                } catch {
                    errorMessage = error.localizedDescription
                }
            } else {
                await login(username: credentials.username, password: credentials.password, storeCredentials: false)
            }
            return
        }

        if dashboard == nil {
            errorMessage = "Please sign in to load your dashboard."
        }
    }

    func biometricBiometryType() -> LABiometryType {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return .none
        }
        return context.biometryType
    }

    func hasSavedBiometricCredentials() -> Bool {
        KeychainHelper.loadCredentials() != nil
    }

    func biometricLogin() async {
        guard let credentials = KeychainHelper.loadCredentials() else {
            errorMessage = "No saved credentials found."
            return
        }

        do {
            try await authenticateWithBiometrics()
            await login(username: credentials.username, password: credentials.password, storeCredentials: false)
        } catch let error as LAError where error.code == .userCancel || error.code == .systemCancel || error.code == .appCancel {
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func login(username: String, password: String, storeCredentials: Bool = true) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await APIClient.shared.login(username: username, password: password)
            guard response.success else {
                isAuthenticated = false
                errorMessage = "Login failed. Check your username/password."
                return
            }

            isAuthenticated = true
            if storeCredentials {
                KeychainHelper.saveCredentials(username: username, password: password)
            }

            async let paidTask: Void = loadPaidStatus()
            async let readTask: Void = loadReadMessages()
            _ = await (paidTask, readTask)

            do {
                try await loadLatestData()
            } catch {
                if dashboard != nil {
                    errorMessage = "Connected. Showing last saved dashboard data."
                } else {
                    errorMessage = error.localizedDescription
                }
            }
        } catch {
            isAuthenticated = false
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        isLoading = true
        defer { isLoading = false }

        try? await APIClient.shared.logout()
        isAuthenticated = false
        KeychainHelper.clearCredentials()
        clearCookies()
    }

    func loadLatestData() async throws {
        do {
            let latest = try await APIClient.shared.latest()
            dashboard = latest
            cacheDashboard(latest)
            updateSyncDate()
            errorMessage = nil
        } catch {
            if let cached = dashboard {
                dashboard = cached
                errorMessage = "Showing cached data."
            }
            throw error
        }
    }

    func refreshDashboard() async {
        guard isAuthenticated else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            let fresh = try await APIClient.shared.check()
            dashboard = fresh
            cacheDashboard(fresh)
            updateSyncDate()
            errorMessage = nil
        } catch APIClientError.unauthorized {
            isAuthenticated = false
            errorMessage = "Session expired. Please sign in again."
        } catch {
            if dashboard != nil {
                errorMessage = "Offline. Showing last saved data."
            } else {
                errorMessage = error.localizedDescription
            }
        }
    }

    func loadDashboardIfNeeded() async {
        guard isAuthenticated, dashboard == nil else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            try await loadLatestData()
        } catch APIClientError.unauthorized {
            isAuthenticated = false
            errorMessage = "Session expired. Please sign in again."
        } catch {
            if dashboard != nil {
                errorMessage = "Offline. Showing last saved data."
            } else {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func startNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOffline = path.status != .satisfied
            }
        }
        monitor.start(queue: monitorQueue)
    }

    private func cacheDashboard(_ value: DashboardData) {
        Self.cache(value, forKey: Constants.dashboardCacheKey)
    }

    private func updateSyncDate() {
        lastSyncDate = Date()
        UserDefaults.standard.set(lastSyncDate, forKey: Constants.lastSyncKey)
    }

    func clearAllCachedData() {
        UserDefaults.standard.removeObject(forKey: Constants.dashboardCacheKey)
        UserDefaults.standard.removeObject(forKey: Constants.lastSyncKey)
        dashboard = nil
        lastSyncDate = nil
    }

    private static func cache<T: Encodable>(_ value: T, forKey key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private static func loadCached<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private func clearCookies() {
        guard let cookies = HTTPCookieStorage.shared.cookies else { return }
        for cookie in cookies {
            HTTPCookieStorage.shared.deleteCookie(cookie)
        }
    }

    private func authenticateWithBiometrics() async throws {
        let context = LAContext()
        try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Sign in to Tally")
    }
}
