import Foundation
import LocalAuthentication
import Network
import Observation
import UIKit

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
    var avatarImageData: Data? = nil
    var reportMonths: [String: String] = [:]

    var isCurrentMonthFiled: Bool {
        let c = Calendar.current
        let now = Date()
        let key = String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
        return reportMonths[key] != nil
    }

    private static let avatarFileURL: URL = {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("tally_avatar.png")
    }()

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.heyitsmejosh.tally.network")
    private var isRefreshing = false

    private var storedCredentials: KeychainHelper.Credentials?

    var username: String? {
        KeychainHelper.loadCredentials()?.username
    }

    init() {
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
            let img = Self.generateNodeGraphAvatar()
            if let png = img.pngData() {
                try? png.write(to: Self.avatarFileURL)
                avatarImageData = png
            }
        }
    }

    deinit {
        monitor.cancel()
    }

    var paymentAmountText: String {
        dashboard?.paymentAmount ?? "--"
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

    func markMessageRead(_ id: String) async {
        readMessageIds.insert(id)
        guard isAuthenticated else { return }
        let ids = Array(readMessageIds)
        _ = try? await APIClient.shared.markMessagesRead(ids: ids)
    }

    func markAllMessagesRead() async {
        let allIds = statusMessageItems.map(\.id)
        readMessageIds = Set(allIds)
        guard isAuthenticated else { return }
        _ = try? await APIClient.shared.markMessagesRead(ids: allIds)
    }

    var isPaid: Bool {
        paidStatus?.paid ?? false
    }

    var paidDateText: String? {
        guard let raw = paidStatus?.updatedAt, !raw.isEmpty,
              let date = DateParsing.parse(raw) else { return nil }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }

    func refreshReportStatus() async {
        guard isAuthenticated else { return }
        if let months = try? await APIClient.shared.getReportStatus() {
            reportMonths = months
        }
    }

    func markMonthFiled() async {
        let c = Calendar.current
        let now = Date()
        let key = String(format: "%04d-%02d", c.component(.year, from: now), c.component(.month, from: now))
        try? await APIClient.shared.setReportStatus(month: key, filed: true)
        await refreshReportStatus()
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

    func saveAvatarData(_ data: Data) {
        avatarImageData = data
        try? data.write(to: Self.avatarFileURL)
    }

    func regenerateAvatar() {
        let img = Self.generateNodeGraphAvatar()
        if let png = img.pngData() {
            saveAvatarData(png)
        }
    }

    static func generateNodeGraphAvatar(size: CGFloat = 200) -> UIImage {
        let s = size
        let cx = s / 2, cy = s / 2
        typealias Pt = (CGFloat, CGFloat)
        let topologies: [([Pt], [(Int, Int)])] = [
            // Star/hub
            ([(0,-58),(46,-30),(55,18),(20,56),(-20,56),(-55,18),(-46,-30),(0,0)],
             [(7,0),(7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0)]),
            // Hexagon ring + inner triangle
            ([(0,-55),(48,-27),(48,27),(0,55),(-48,27),(-48,-27),(0,-22),(22,11),(-22,11)],
             [(0,1),(1,2),(2,3),(3,4),(4,5),(5,0),(6,7),(7,8),(8,6),(0,6),(2,7),(4,8)]),
            // Scattered mesh
            ([(-38,-50),(18,-52),(52,-10),(44,42),(0,55),(-44,34),(-54,-10),(0,-10),(30,12),(-25,18)],
             [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0),(0,7),(2,8),(4,9),(7,8),(8,9),(7,9)]),
        ]
        let (baseOffsets, allEdges) = topologies.randomElement()!
        let jitter: CGFloat = CGFloat.random(in: 8...16)
        let nodes = baseOffsets.map { dx, dy in
            CGPoint(
                x: cx + dx + CGFloat.random(in: -jitter...jitter),
                y: cy + dy + CGFloat.random(in: -jitter...jitter)
            )
        }
        let edgeDensity = Double.random(in: 0.55...0.85)
        let activeEdges = allEdges.filter { _ in Double.random(in: 0...1) < edgeDensity }

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: s, height: s))
        return renderer.image { ctx in
            let cg = ctx.cgContext
            // Dark circle background
            UIColor(hex: "0d0c0b").setFill()
            cg.fillEllipse(in: CGRect(x: 0, y: 0, width: s, height: s))

            // Edges
            cg.setStrokeColor(UIColor(red: 1, green: 0.52, blue: 0.11, alpha: 0.3).cgColor)
            cg.setLineWidth(1.5)
            cg.setLineCap(.round)
            for (a, b) in activeEdges where a < nodes.count && b < nodes.count {
                cg.move(to: nodes[a])
                cg.addLine(to: nodes[b])
            }
            cg.strokePath()

            // Nodes
            for (i, node) in nodes.enumerated() {
                let r = CGFloat.random(in: 5...11)
                let isAccent = i == 0 || i == nodes.count / 2
                if isAccent {
                    UIColor(hex: "FF851B").setFill()
                } else {
                    UIColor(red: 0.95, green: 0.93, blue: 0.91, alpha: 0.75).setFill()
                }
                cg.fillEllipse(in: CGRect(x: node.x - r, y: node.y - r, width: r * 2, height: r * 2))
                if isAccent {
                    UIColor(white: 1, alpha: 0.4).setFill()
                    let dot: CGFloat = 2.5
                    cg.fillEllipse(in: CGRect(x: node.x - dot, y: node.y - dot, width: dot * 2, height: dot * 2))
                }
            }
        }
    }

    func bootstrap() async {
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
                _ = await (paidTask, readTask)
                try? await loadLatestData()
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
        guard isAuthenticated, !isRefreshing else { return }
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
            dashboard = fresh
            cacheDashboard(fresh)
            updateSyncDate()
            errorMessage = nil
            if let months = try? await APIClient.shared.getReportStatus() {
                reportMonths = months
            }
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
