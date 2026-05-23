import Foundation
import Observation
import Network

@Observable
@MainActor
final class MacAppState {
    private enum Constants {
        static let dashboardCacheKey = "cached-dashboard-data"
        static let lastSyncKey = "last-sync-date"
        static let appGroup = "group.com.jt.tally"
    }

    var isAuthenticated = false
    var isLoading = false
    var errorMessage: String?
    var dashboard: MacDashboardData?
    var isOffline = false
    var selectedSection: AppSection = .dashboard

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.jt.tally.mac.network")

    enum AppSection: String, CaseIterable, Identifiable {
        case dashboard = "Dashboard"
        case benefits = "Benefits"
        case messages = "Messages"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .dashboard: return "house"
            case .benefits: return "list.bullet.rectangle"
            case .messages: return "envelope"
            }
        }
    }

    init() {
        startNetworkMonitoring()
        dashboard = loadCached()
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Computed

    var paymentAmountText: String {
        dashboard?.paymentAmount ?? "$0.00"
    }

    var statusMessages: [MacDashboardData.StatusMessage] {
        dashboard?.statusMessages ?? []
    }

    var nextPaymentDateText: String {
        guard let date = parsedNextPaymentDate else { return "--" }
        return date.formatted(date: .abbreviated, time: .omitted)
    }

    var countdownText: String {
        guard let date = parsedNextPaymentDate else { return "--" }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: date)
        let days = Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0
        if days < 0 { return "Payment date passed" }
        if days == 0 { return "Today" }
        return "\(days) day\(days == 1 ? "" : "s")"
    }

    var daysUntilPayment: Int {
        guard let date = parsedNextPaymentDate else { return 0 }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: date)
        return max(0, Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0)
    }

    var parsedNextPaymentDate: Date? {
        guard let raw = dashboard?.nextPaymentDate, !raw.isEmpty else { return nil }
        return MacDateParsing.parse(raw)
    }

    // MARK: - Auth

    func bootstrap() async {
        if let credentials = MacKeychainHelper.loadCredentials() {
            // Fast path: check if server session is still alive (no BC Self-Serve roundtrip)
            if let sessionValid = try? await MacAPIClient.shared.sessionCheck(), sessionValid {
                isAuthenticated = true
                try? await loadLatest()
                return
            }
            // Slow path: full login against BC Self-Serve
            await login(username: credentials.username, password: credentials.password, store: false)
        } else if dashboard == nil {
            errorMessage = "Sign in to load your dashboard."
        }
    }

    func login(username: String, password: String, store: Bool = true) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await MacAPIClient.shared.login(username: username, password: password)
            guard response.success else {
                errorMessage = "Login failed. Check your credentials."
                return
            }
            isAuthenticated = true
            if store {
                MacKeychainHelper.saveCredentials(username: username, password: password)
            }
            try await loadLatest()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        try? await MacAPIClient.shared.logout()
        isAuthenticated = false
        MacKeychainHelper.clearCredentials()
        clearCookies()
    }

    // MARK: - Data

    func loadLatest() async throws {
        let data = try await MacAPIClient.shared.latest()
        dashboard = data
        cacheDashboard(data)
        syncToWidgets(data)
    }

    func refresh() async {
        guard isAuthenticated else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let fresh = try await MacAPIClient.shared.check()
            dashboard = fresh
            cacheDashboard(fresh)
            syncToWidgets(fresh)
            errorMessage = nil
        } catch {
            if dashboard != nil {
                errorMessage = "Offline. Showing cached data."
            } else {
                errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Cache & Widget Sync

    private func cacheDashboard(_ value: MacDashboardData) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        UserDefaults.standard.set(data, forKey: Constants.dashboardCacheKey)
        UserDefaults.standard.set(Date(), forKey: Constants.lastSyncKey)
    }

    private func loadCached() -> MacDashboardData? {
        guard let data = UserDefaults.standard.data(forKey: Constants.dashboardCacheKey) else { return nil }
        return try? JSONDecoder().decode(MacDashboardData.self, from: data)
    }

    private func syncToWidgets(_ data: MacDashboardData) {
        guard let defaults = UserDefaults(suiteName: Constants.appGroup) else { return }
        // Write a lightweight summary for widgets
        let summary = WidgetSyncData(
            paymentTotal: data.paymentAmount,
            nextPaymentDate: data.nextPaymentDate,
            messageCount: data.statusMessages.count,
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
        if let encoded = try? JSONEncoder().encode(summary) {
            defaults.set(encoded, forKey: "widget_sync_data")
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

    private func clearCookies() {
        HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    }
}

// MARK: - Widget Sync Model

struct WidgetSyncData: Codable {
    let paymentTotal: String?
    let nextPaymentDate: String?
    let messageCount: Int
    let lastUpdated: String
}
