import Foundation
import LocalAuthentication
import Network
import Observation
import UIKit
import WidgetKit

@Observable
@MainActor
final class AppState {
    private enum Constants {
        static let dashboardCacheKey = "cached-dashboard-data"
        static let lastSyncKey = "last-sync-date"
    }

    /// App Store screenshot run: state is mocked in `init`, so every network path
    /// must no-op or the first 401 kicks the run back to the login screen.
    static let isSnapshot = CommandLine.arguments.contains("UITEST_SNAPSHOT")

    var isAuthenticated = false
    var isLoading = false
    var errorMessage: String?
    var dashboard: DashboardData? {
        // The widget only sees /api/summary, which has no per-user profiles, so
        // the app hands it the server-derived income through the App Group.
        didSet {
            let shared = UserDefaults(suiteName: "group.com.heyitsmejosh.tally")
            if let total = dashboard?.income?.totalMonthly {
                shared?.set(total, forKey: "widget_income_total")
            } else if dashboard == nil {
                shared?.removeObject(forKey: "widget_income_total")
            }
        }
    }
    var isOffline = false
    var selectedTabIndex: Int = 0
    var lastSyncDate: Date? = nil
    var paidStatus: PaidStatus? = nil
    var readMessageIds: Set<String> = []
    var avatarImageData: Data? = nil
    var reportMonths: [String: String] = [:]
    var pwdApproved: Bool = false

    /// Hours after which a successful scrape is old enough to surface quietly.
    /// The scraper runs on open and on pull-to-refresh, so anything past a day
    /// means refreshes have been failing without ever saying so.
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

    private static let avatarFileURL: URL = {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("talli_avatar.png")
    }()

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.heyitsmejosh.tally.network")
    private var isRefreshing = false

    private var storedCredentials: KeychainHelper.Credentials?

    var username: String? {
        if Self.isSnapshot { return "demo.user" }
        return KeychainHelper.loadCredentials()?.username
    }

    init() {
        if Self.isSnapshot {
            isAuthenticated = true
            // Dates relative to today, so store shots never show a past payday
            // or a "Never synced" banner.
            let day: (Int) -> String = { offset in
                let d = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
                return d.formatted(Date.ISO8601FormatStyle(timeZone: .current).year().month().day())
            }
            dashboard = DashboardData(
                paymentAmount: "$1,750.00",
                nextPaymentDate: day(1),
                statusMessages: [
                    .init(text: "Your monthly report has been received.", timestamp: day(-1)),
                    .init(text: "PWD application resubmitted.", timestamp: day(-12))
                ]
            )
            lastSyncDate = Date()
            UserDefaults.standard.set(Date(), forKey: "report-last-submitted-at")
            reportMonths = [String(format: "%04d-%02d", Calendar.current.component(.year, from: Date()), Calendar.current.component(.month, from: Date())): "filed"]
            return
        }
        startNetworkMonitoring()
        dashboard = Self.loadCached(DashboardData.self, forKey: Constants.dashboardCacheKey)
        lastSyncDate = UserDefaults.standard.object(forKey: Constants.lastSyncKey) as? Date
        storedCredentials = KeychainHelper.loadCredentials()
        if let diskData = try? Data(contentsOf: Self.avatarFileURL),
           UIImage(data: diskData) != nil {
            avatarImageData = diskData
        } else {
            try? FileManager.default.removeItem(at: Self.avatarFileURL)
            UserDefaults.standard.removeObject(forKey: "avatar-image")
        }
    }

    deinit {
        monitor.cancel()
    }

    var paymentAmountText: String {
        dashboard?.paymentAmount ?? "--"
    }

    /// Server-derived monthly income (PWD + CDB). Nil when the server predates
    /// the income block, in which case the breakdown section is simply hidden.
    var income: DashboardData.Income? {
        dashboard?.income
    }

    var earnings: DashboardData.Earnings? {
        dashboard?.earnings
    }

    var assets: DashboardData.Assets? {
        dashboard?.assets
    }

    var yearReview: DashboardData.YearReview? {
        dashboard?.yearReview
    }

    private static let moneyFormat: FloatingPointFormatStyle<Double>.Currency =
        .currency(code: "CAD").precision(.fractionLength(0))

    func moneyText(_ amount: Double) -> String {
        amount.formatted(Self.moneyFormat)
    }

    /// BC minimum wage, indexed every June 1. Update the constant, nothing else.
    private static let bcMinimumWage = 17.85
    private static let fullTimeHoursPerMonth = 40.0 * 52 / 12

    /// Income framed as rates, matching the web dashboard's list.
    var incomeRates: [(label: String, value: String)] {
        guard let total = income?.totalMonthly, total > 0 else { return [] }
        let money: (Double) -> String = { $0.formatted(.currency(code: "CAD").precision(.fractionLength(2))) }
        return [
            ("per day", money(total / 30)),
            ("per hour, every hour", money(total / 30 / 24)),
            ("per waking hour (16h/day)", money(total / 30 / 16)),
            ("per hour at a 40h week", money(total / Self.fullTimeHoursPerMonth)),
        ]
    }

    /// "53% of BC minimum wage" line under the rates; nil without income.
    var minimumWageComparisonText: String? {
        guard let total = income?.totalMonthly, total > 0 else { return nil }
        let pct = Int((total / Self.fullTimeHoursPerMonth / Self.bcMinimumWage * 100).rounded())
        return "\(pct)% of BC minimum wage ($\(Self.bcMinimumWage.formatted(.number.precision(.fractionLength(2))))/hour) on a full-time schedule"
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

    var daysUntilPayment: Int? {
        guard let date = parsedNextPaymentDate else { return nil }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: date)
        let days = Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0
        return days > 0 ? days : nil
    }

    var countdownText: String {
        guard let date = parsedNextPaymentDate else { return "--" }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.startOfDay(for: date)
        let days = Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0
        if days < 0 { return "Payment date passed" }
        if days == 0 { return "Today" }
        if days == 1 { return "Tomorrow" }
        return "\(days) days"
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
            // Union, not replace: a stale server copy must never resurrect the badge.
            readMessageIds.formUnion(data.readIds)
        } catch {
            // Non-critical
        }
    }

    func markMessageRead(_ id: String) async {
        readMessageIds.insert(id)
        guard isAuthenticated else { return }
        let ids = Array(readMessageIds)
        _ = try? await APIClient.shared.markMessagesRead(ids: ids)
    }

    func markAllMessagesRead() async {
        guard unreadMessageCount > 0 else { return }
        let allIds = statusMessageItems.map(\.id)
        readMessageIds.formUnion(allIds)
        guard isAuthenticated else { return }
        _ = try? await APIClient.shared.markMessagesRead(ids: allIds)
    }

    private func currentMonthKey() -> String {
        let c = Calendar.current; let now = Date()
        return String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
    }

    var isPaid: Bool {
        paidStatus?.paidMonths[currentMonthKey()] != nil
    }

    var paidDateText: String? {
        guard let raw = paidStatus?.paidMonths[currentMonthKey()], !raw.isEmpty,
              let date = DateParsing.parse(raw) else { return nil }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }

    func refreshReportStatus() async {
        guard isAuthenticated else { return }
        if let status = try? await APIClient.shared.getReportStatus() {
            reportMonths = status.months
            pwdApproved = status.pwdApproved
        }
    }

    func markMonthFiled() async {
        let c = Calendar.current
        let now = Date()
        let key = String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
        try? await APIClient.shared.setReportStatus(month: key, filed: true)
        await refreshReportStatus()
        await PaydayNotificationScheduler.reschedule(nextPaymentDate: parsedNextPaymentDate, currentMonthFiled: isCurrentMonthFiled, earnings: earningsForWarning, lastIssued: dashboard?.lastIssued)
    }

    func loadPaidStatus() async {
        guard isAuthenticated else { return }
        do {
            paidStatus = try await APIClient.shared.getPaidStatus()
        } catch {
            // Non-critical -- don't surface error
        }
    }

    func syncAvatar() async {
        guard isAuthenticated else { return }
        // The server gives every user a civil-servant avatar, so there is always a URL to load.
        guard let profile = try? await APIClient.shared.getProfile() else { return }
        await loadAvatar(from: profile.avatarUrl)
    }

    private func loadAvatar(from avatarUrl: String?) async {
        // Relative URLs resolve against the API host; async so the main actor never blocks.
        guard let avatarUrl, !avatarUrl.isEmpty,
              let url = URL(string: avatarUrl, relativeTo: URL(string: "https://talli.jaybulb.com")),
              let (data, _) = try? await URLSession.shared.data(from: url),
              UIImage(data: data) != nil else { return }
        saveAvatarData(data)
    }

    /// Marks the cheque for one month key (YYYY-MM) as received, e.g. from the missed-payment alert.
    func markPaid(month: String) async {
        guard isAuthenticated else { return }
        var months = paidStatus?.paidMonths ?? [:]
        months[month] = ISO8601DateFormatter().string(from: Date())
        paidStatus = PaidStatus(paidMonths: months)
        if let saved = try? await APIClient.shared.setPaidStatus(paid: true, month: month) { paidStatus = saved }
    }

    func togglePaid() async {
        guard isAuthenticated else { return }
        let previous = paidStatus
        let key = currentMonthKey()
        let newValue = paidStatus?.paidMonths[key] == nil
        var months = paidStatus?.paidMonths ?? [:]
        if newValue { months[key] = ISO8601DateFormatter().string(from: Date()) } else { months.removeValue(forKey: key) }
        paidStatus = PaidStatus(paidMonths: months)
        do {
            paidStatus = try await APIClient.shared.setPaidStatus(paid: newValue, month: key)
        } catch {
            paidStatus = previous
        }
    }

    func updateWidgetToken() async {
        guard !Self.isSnapshot, isAuthenticated else { return }
        do {
            let token = try await APIClient.shared.widgetToken()
            let shared = UserDefaults(suiteName: "group.com.heyitsmejosh.tally")
            shared?.set(token, forKey: "api_token")
            WatchSync.shared.send(token: token)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            // Non-critical
        }
    }

    func saveAvatarData(_ data: Data) {
        avatarImageData = data
        try? data.write(to: Self.avatarFileURL)
    }

    func regenerateAvatar() async {
        guard isAuthenticated, let url = try? await APIClient.shared.regenerateAvatar() else { return }
        await loadAvatar(from: url)
    }

    func bootstrap() async {
        // Store shots show a real portrait, fetched the same way a signed-in user's is.
        if Self.isSnapshot { await loadAvatar(from: "/avatars/07-front-counter.png"); return }
        // Optimistic: show cached dashboard immediately while session check runs
        if storedCredentials != nil, dashboard != nil {
            isAuthenticated = true
        }

        // Fast path: check if server session is still alive (no BC Self-Serve roundtrip)
        if let _ = storedCredentials {
            if let sessionValid = try? await APIClient.shared.sessionCheck(), sessionValid {
                isAuthenticated = true
                async let paidTask: Void = loadPaidStatus()
                async let readTask: Void = loadReadMessages()
                async let avatarTask: Void = syncAvatar()
                _ = await (paidTask, readTask, avatarTask)
                do {
                    try await loadLatestData()
                } catch {
                    // Silent failure here is how the dashboard sat on "--" forever.
                    if dashboard == nil { errorMessage = error.localizedDescription }
                }
                Task { await refreshDashboard() }
                return
            }
        }

        // Session expired — revoke optimistic auth and do full re-auth
        isAuthenticated = false

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
                errorMessage = response.error ?? "Login failed. Check your username/password."
                return
            }

            isAuthenticated = true
            if storeCredentials {
                KeychainHelper.saveCredentials(username: username, password: password)
            }

            async let paidTask: Void = loadPaidStatus()
            async let readTask: Void = loadReadMessages()
            // a fresh sign-in also picks up the server's portrait; before, only a resumed session did
            async let avatarTask: Void = syncAvatar()
            _ = await (paidTask, readTask, avatarTask)

            do {
                try await loadLatestData()
            } catch {
                if dashboard != nil {
                    errorMessage = "Connected. Showing last saved dashboard data."
                } else {
                    errorMessage = error.localizedDescription
                }
            }
            await updateWidgetToken()
            Task { await refreshDashboard() }
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
        readMessageIds = []
        KeychainHelper.clearCredentials()
        clearCookies()
        OfflineCache.clear()
        let shared = UserDefaults(suiteName: "group.com.heyitsmejosh.tally")
        shared?.removeObject(forKey: "api_token")
    }

    func loadLatestData() async throws {
        do {
            let latest = try await APIClient.shared.latest()
            dashboard = latest
            cacheDashboard(latest)
            updateSyncDate()
            errorMessage = nil
        } catch {
            if dashboard != nil {
                errorMessage = "Showing cached data."
            } else {
                errorMessage = error.localizedDescription
            }
            throw error
        }
    }

    func refreshDashboard() async {
        guard !Self.isSnapshot, isAuthenticated, !isRefreshing else { return }
        isRefreshing = true
        isLoading = true
        defer {
            isLoading = false
            isRefreshing = false
        }

        do {
            async let dashTask = APIClient.shared.check()
            async let readTask: Void = loadReadMessages()
            let fresh = try await dashTask
            _ = await readTask
            dashboard = fresh.data
            cacheDashboard(fresh.data)
            // Only stamp a sync when the live scrape actually ran. api/mobile
            // still serves cached data when the scrape fails, so stamping
            // unconditionally would report a wedged scrape as a fresh sync.
            if fresh.scrapeSucceeded { updateSyncDate() }
            errorMessage = nil
            if let status = try? await APIClient.shared.getReportStatus() {
                reportMonths = status.months
                pwdApproved = status.pwdApproved
            }
            await updateWidgetToken()
            await PaydayNotificationScheduler.requestAuthorizationIfNeeded()
            await PaydayNotificationScheduler.reschedule(nextPaymentDate: parsedNextPaymentDate, currentMonthFiled: isCurrentMonthFiled, earnings: earningsForWarning, lastIssued: dashboard?.lastIssued)
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
        guard !Self.isSnapshot, isAuthenticated, dashboard == nil else { return }

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
            let offline = path.status != .satisfied
            Task { @MainActor [weak self] in self?.isOffline = offline }
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
        try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Sign in to Talli")
    }
}
