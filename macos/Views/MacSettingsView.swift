import SwiftUI
import UserNotifications

@MainActor
struct MacSettingsView: View {
    @AppStorage("app_theme") private var rawTheme = "system"
    @AppStorage("notifications_payday_enabled") private var paydayNotificationsEnabled = true
    @AppStorage("notifications_reporting_window_enabled") private var reportingWindowNotificationsEnabled = true
    @EnvironmentObject private var appState: MacAppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Account")
                    .font(.headline)
                AccountCard(username: appState.username) {
                    Task { await appState.logout() }
                }
                .modifier(MacGlassCard())

                Text("Notifications")
                    .font(.headline)
                NotificationsCard(
                    paydayEnabled: $paydayNotificationsEnabled,
                    reportingWindowEnabled: $reportingWindowNotificationsEnabled
                )
                .modifier(MacGlassCard())

                Text("Appearance")
                    .font(.headline)
                AppearancePicker(rawTheme: $rawTheme)
                    .modifier(MacGlassCard())
            }
            // a tab now, not a sheet: same reading column as Messages, no title (the nav bar names it)
            .frame(maxWidth: 680)
            .padding(24)
            .frame(maxWidth: .infinity)
        }
    }
}

@MainActor
private struct AccountCard: View {
    let username: String
    let signOut: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Signed in as")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(username.isEmpty ? "Unknown" : username)
                    .font(.body.weight(.medium))
            }
            Spacer()
            Button("Sign Out", action: signOut)
                .buttonStyle(.bordered)
        }
    }
}

@MainActor
private struct NotificationsCard: View {
    @Binding var paydayEnabled: Bool
    @Binding var reportingWindowEnabled: Bool
    @AppStorage("notifications_earnings_enabled") private var earningsEnabled = true

    // Off takes effect now; back on waits for the next refresh's reschedule.
    private func cancel(_ id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle("Payday Reminder", isOn: $paydayEnabled)
                .onChange(of: paydayEnabled) { on in
                    if !on { cancel(PaydayNotificationScheduler.paydayId) }
                }
            Toggle("Reporting Window Reminder", isOn: $reportingWindowEnabled)
                .onChange(of: reportingWindowEnabled) { on in
                    if !on { cancel(PaydayNotificationScheduler.reportingWindowId); cancel(PaydayNotificationScheduler.reportNudgeId) }
                }
            Toggle("Earnings Limit Warning", isOn: $earningsEnabled)
                .onChange(of: earningsEnabled) { on in
                    if !on { cancel(PaydayNotificationScheduler.earningsId) }
                }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

@MainActor
private struct AppearancePicker: View {
    @Binding var rawTheme: String
    private let options = [("light", "Light"), ("dark", "Dark"), ("system", "System")]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.0) { id, label in
                Button { rawTheme = id } label: {
                    VStack(spacing: 8) {
                        themePreview(id)
                            .frame(height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .stroke(rawTheme == id ? Color.accentColor : Color.primary.opacity(0.12), lineWidth: 2)
                            )
                        Text(label)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(rawTheme == id ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(.secondary))
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder
    private func themePreview(_ id: String) -> some View {
        switch id {
        case "light":
            RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(white: 0.92))
        case "dark":
            RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(white: 0.12))
        default:
            GeometryReader { geo in
                ZStack {
                    Color(white: 0.92)
                    Path { p in
                        p.move(to: CGPoint(x: geo.size.width, y: 0))
                        p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                        p.addLine(to: CGPoint(x: 0, y: geo.size.height))
                        p.closeSubpath()
                    }.fill(Color(white: 0.12))
                }
            }
        }
    }
}
