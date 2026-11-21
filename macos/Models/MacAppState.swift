import Combine
import Foundation
import Network
import WidgetKit

/// ObservableObject (not @Observable) so the Mac app runs on macOS 13 Ventura.
@MainActor
final class MacAppState: ObservableObject {
    private enum Constants {
        static let dashboardCacheKey = "cached-dashboard-data"
        static let lastSyncKey = "last-sync-date"
        static let appGroup = "group.com.heyitsmejosh.tally"
    }

    @Published var isAuthenticated = false
    @Published var username = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var dashboard: MacDashboardData? {
        didSet {
            let shared = UserDefaults(suiteName: Constants.appGroup)
            if let total = dashboard?.income?.totalMonthly {
                shared?.set(total, forKey: "widget_income_total")
            } else if dashboard == nil {
                shared?.removeObject(forKey: "widget_income_total")
            }
        }
    }
    @Published var isOffline = false
    @Published var selectedSection: AppSection = .dashboard
    @Published var reportMonths: [String: String] = [:]
    @Published var pwdApproved: Bool = false
    @Published var lastSyncDate: Date? = UserDefaults.standard.object(forKey: Constants.lastSyncKey) as? Date

    /// Hours after which a successful scrape is old enough to surface quietly.
    private static let staleSyncHours = 24.0

    /// True when the last *successful* scrape is old enough to be worth showing.
    /// nil lastSyncDate means no successful sync has ever been recorded.
    var isSyncStale: Bool {
        guard isAuthenticated, dashboard != nil else { return false }
        guard let lastSyncDate else { return true }
        return Date().timeIntervalSince(lastSyncDate) > Self.staleSyncHours * 3600
    }

    /// This year's earnings in the shape the limit warning needs, or nil when the server has not sent them.
    var earningsForWarning: (year: Int, earned: Double, exemption: Double)? {
        guard let e = earnings, let y = e.year, let earned = e.earned, let ex = e.exemption else { return nil }
        return (y, earned, ex)
    }

    var isCurrentMonthFiled: Bool {
        let c = Calendar.current
        let now = Date()
        let key = String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
        return reportMonths[key] != nil
    }

    var isFilingWindowOpen: Bool {
        !pwdApproved && Calendar.current.component(.day, from: Date()) <= 5
    }

    var income: MacDashboardData.Income? {
        dashboard?.income
    }

    var earnings: MacDashboardData.Earnings? {
        dashboard?.earnings
    }

    var assets: MacDashboardData.Assets? {
        dashboard?.assets
    }

    var yearReview: MacDashboardData.YearReview? {
        dashboard?.yearReview
    }

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.jt.talli.mac.network")

    enum AppSection: String, CaseIterable, Identifiable {
        case dashboard = "Home"
        case benefits = "Status"
        case messages = "Messages"
        case settings = "Settings"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .dashboard: return "house"
            case .benefits: return "list.bullet.rectangle"
            case .messages: return "envelope"
            case .settings: return "gearshape"
            }
        }
    }

    init() {
        if (ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] != nil) {
            isAuthenticated = true
            username = "your.username"
            // Dates relative to today, so store shots never show a past payday
            // or a stale-sync banner. Same as the iOS mock.
            let day: (Int) -> String = { offset in
                let d = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
                return d.formatted(Date.ISO8601FormatStyle(timeZone: .current).year().month().day())
            }
            dashboard = MacDashboardData(
                paymentAmount: "$1,750.00",
                nextPaymentDate: day(1),
                statusMessages: [
                    .init(text: "Your monthly report has been received.", timestamp: day(-1)),
                    .init(text: "PWD application resubmitted.", timestamp: day(-12))
                ]
            )
            lastSyncDate = Date()
            let c = Calendar.current
            reportMonths = [String(format: "%04d-%02d", c.component(.year, from: Date()), c.component(.month, from: Date())): "filed"]
            return
        }
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
        if days == 1 { return "Tomorrow" }
        return "in \(days) days"
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
        if (ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] != nil) { return }
        if let credentials = MacKeychainHelper.loadCredentials() {
            // Fast path: check if server session is still alive (no BC Self-Serve roundtrip)
            if let sessionValid = try? await MacAPIClient.shared.sessionCheck(), sessionValid {
                isAuthenticated = true
                self.username = credentials.username
                try? await loadLatest()
                Task { await refresh() }
                Task { await refreshReportStatus() }
                return
            }
            // Slow path: full login against BC Self-Serve
            await login(username: credentials.username, password: credentials.password, store: false)
        }
        // No saved login: the sign-in screen already says what to do, so no red error before a first try.
    }

    func login(username: String, password: String, store: Bool = true) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await MacAPIClient.shared.login(username: username, password: password)
            guard response.success else {
                errorMessage = response.error ?? "Login failed. Check your credentials."
                return
            }
            isAuthenticated = true
            self.username = username
            if store {
                MacKeychainHelper.saveCredentials(username: username, password: password)
            }
            try await loadLatest()
            await updateWidgetToken()
            Task { await refresh() }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        try? await MacAPIClient.shared.logout()
        isAuthenticated = false
        username = ""
        MacKeychainHelper.clearCredentials()
        clearCookies()
        OfflineCache.clear()
        let shared = UserDefaults(suiteName: Constants.appGroup)
        shared?.removeObject(forKey: "api_token")
    }

    // MARK: - Data

    func refreshReportStatus() async {
        guard isAuthenticated else { return }
        if let status = try? await MacAPIClient.shared.getReportStatus() {
            reportMonths = status.months
            pwdApproved = status.pwdApproved
        }
    }

    func markMonthFiled() async {
        let c = Calendar.current
        let now = Date()
        let key = String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
        try? await MacAPIClient.shared.setReportStatus(month: key, filed: true)
        await refreshReportStatus()
        await PaydayNotificationScheduler.reschedule(nextPaymentDate: parsedNextPaymentDate, currentMonthFiled: isCurrentMonthFiled, earnings: earningsForWarning, lastIssued: dashboard?.lastIssued)
    }

    func updateWidgetToken() async {
        guard ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] == nil, isAuthenticated else { return }
        do {
            let token = try await MacAPIClient.shared.widgetToken()
            let shared = UserDefaults(suiteName: Constants.appGroup)
            shared?.set(token, forKey: "api_token")
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            // Non-critical
        }
    }

    func loadLatest() async throws {
        let data = try await MacAPIClient.shared.latest()
        dashboard = data
        cacheDashboard(data)
        syncToWidgets(data)
        if ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] == nil {
            await PaydayNotificationScheduler.requestAuthorizationIfNeeded()
            await PaydayNotificationScheduler.reschedule(nextPaymentDate: parsedNextPaymentDate, currentMonthFiled: isCurrentMonthFiled, earnings: earningsForWarning, lastIssued: dashboard?.lastIssued)
        }
    }

    func refresh() async {
        guard isAuthenticated else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            async let dashTask = MacAPIClient.shared.check()
            async let reportTask: Void = refreshReportStatus()
            let fresh = try await dashTask
            _ = await reportTask
            dashboard = fresh.data
            cacheDashboard(fresh.data)
            syncToWidgets(fresh.data)
            if fresh.scrapeSucceeded { updateSyncDate() }
            errorMessage = nil
            await updateWidgetToken()
            if ProcessInfo.processInfo.environment["UITEST_SNAPSHOT"] == nil {
                await PaydayNotificationScheduler.requestAuthorizationIfNeeded()
                await PaydayNotificationScheduler.reschedule(nextPaymentDate: parsedNextPaymentDate, currentMonthFiled: isCurrentMonthFiled, earnings: earningsForWarning, lastIssued: dashboard?.lastIssued)
            }
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
    }

    /// Stamped only when the live scrape actually ran -- caching alone happens
    /// even on a wedged scrape, so stamping there reported stale data as fresh.
    private func updateSyncDate() {
        lastSyncDate = Date()
        UserDefaults.standard.set(lastSyncDate, forKey: Constants.lastSyncKey)
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
            let offline = path.status != .satisfied
            Task { @MainActor [weak self] in self?.isOffline = offline }
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
