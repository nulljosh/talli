import SwiftUI
import UIKit

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var showSplash = true

    var body: some View {
        NavigationStack {
            Group {
                if appState.isAuthenticated {
                    AuthenticatedTabShell()
                } else {
                    LoginScreen()
                }
            }
        }
        .overlay {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            }
        }
        .task {
            try? await Task.sleep(for: .milliseconds(800))
            withAnimation(.easeOut(duration: 0.4)) {
                showSplash = false
            }
        }
        .task {
            await appState.bootstrap()
        }
    }
}

private struct AuthenticatedTabShell: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState
        TabView(selection: $appState.selectedTabIndex) {
            DashboardScreen()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)
                .toolbar(.hidden, for: .tabBar)
            ReportView()
                .tabItem { Label("Reports", systemImage: "list.bullet.clipboard.fill") }
                .tag(1)
                .toolbar(.hidden, for: .tabBar)
            BenefitsView()
                .tabItem { Label("Benefits", systemImage: "heart.text.clipboard.fill") }
                .tag(2)
                .toolbar(.hidden, for: .tabBar)
            MessagesView()
                .tabItem { Label("Messages", systemImage: "message.fill") }
                .tag(3)
                .toolbar(.hidden, for: .tabBar)
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(4)
                .toolbar(.hidden, for: .tabBar)
        }
        .toolbar(.hidden, for: .tabBar)
        .onChange(of: appState.selectedTabIndex) { _, _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
        .tint(Color.talliOrange)
        .overlay(alignment: .bottom) {
            TalliFloatingTabBar(selectedTab: $appState.selectedTabIndex, unreadCount: appState.unreadMessageCount)
                .padding(.bottom, 8)
        }
    }
}

private struct TalliFloatingTabBar: View {
    @Binding var selectedTab: Int
    let unreadCount: Int

    private let tabs: [(icon: String, fill: String, label: String)] = [
        ("house", "house.fill", "Home"),
        ("list.bullet.clipboard", "list.bullet.clipboard.fill", "Reports"),
        ("heart.text.clipboard", "heart.text.clipboard.fill", "Benefits"),
        ("message", "message.fill", "Messages"),
        ("gearshape", "gearshape.fill", "Settings"),
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs.indices, id: \.self) { index in
                tabButton(index)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 10)
        .frame(maxWidth: 360)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.primary.opacity(0.08), lineWidth: 1))
        .shadow(color: .black.opacity(0.1), radius: 12, y: 4)
    }

    private func tabButton(_ index: Int) -> some View {
        Button {
            selectedTab = index
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: selectedTab == index ? tabs[index].fill : tabs[index].icon)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(selectedTab == index ? Color.talliOrange : Color.secondary)
                    .symbolEffect(.bounce, value: selectedTab == index)
                    .frame(width: 50, height: 40)
                    .background {
                        if selectedTab == index {
                            Capsule().fill(Color.talliOrange.opacity(0.1))
                        }
                    }
                if index == 3 && unreadCount > 0 {
                    Circle()
                        .fill(Color.talliOrange)
                        .frame(width: 8, height: 8)
                        .offset(x: -4, y: 4)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .buttonStyle(.plain)
        .accessibilityLabel(tabs[index].label)
    }
}

private struct LoginScreen: View {
    @Environment(AppState.self) private var appState
    @State private var username = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            VStack(spacing: 8) {
                Image("LaunchIcon")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 72, height: 72)
                Text("Talli")
                    .font(.system(size: 42, weight: .bold))
                Text("Your benefits. No bureaucracy.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("BCEID USERNAME")
                        .sectionLabel()
                    TextField("your.username", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("PASSWORD")
                        .sectionLabel()
                    SecureField("••••••••", text: $password)
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }

            Button {
                Task { await appState.login(username: username, password: password) }
            } label: {
                HStack {
                    if appState.isLoading { ProgressView().tint(.white) }
                    Text("Sign In").fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.talliOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .foregroundStyle(.white)
            }
            .disabled(username.isEmpty || password.isEmpty || appState.isLoading)
            .opacity((username.isEmpty || password.isEmpty || appState.isLoading) ? 0.6 : 1)

            if let error = appState.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red.opacity(0.9))
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding(24)
        .background(Color(hex: "1a1612").ignoresSafeArea())
        .preferredColorScheme(.dark)
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct TimelineCard: View {
    let title: String
    let steps: [(label: String, date: String, done: Bool)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.secondary)

            ForEach(steps, id: \.label) { step in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(step.done ? Color.primary : Color.secondary.opacity(0.3))
                        .frame(width: 10, height: 10)
                        .padding(.top, 4)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.label)
                            .font(.subheadline.weight(.medium))
                        Text(step.date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }
}

private struct ApplicationTimelinesCard: View {
    let pwdSteps: [(label: String, date: String, done: Bool)]
    let dtcSteps: [(label: String, date: String, done: Bool)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            timelineSection(title: "PWD APPLICATION", steps: pwdSteps)
            Divider()
            timelineSection(title: "DTC APPLICATION", steps: dtcSteps)
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }

    private func timelineSection(title: String, steps: [(label: String, date: String, done: Bool)]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.secondary)

            ForEach(steps, id: \.label) { step in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(step.done ? Color.primary : Color.secondary.opacity(0.3))
                        .frame(width: 10, height: 10)
                        .padding(.top, 4)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.label)
                            .font(.subheadline.weight(.medium))
                        Text(step.date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

private struct DashboardScreen: View {
    @Environment(AppState.self) private var appState
    @State private var now = Date()
    private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var liveCountdownText: String {
        guard let date = appState.parsedNextPaymentDate else { return "--" }
        var target = date
        let cal = Calendar.current
        target = cal.startOfDay(for: target)
        let diff = max(0, target.timeIntervalSince(now))
        let days = Int(diff) / 86400
        let hrs = (Int(diff) % 86400) / 3600
        let mins = (Int(diff) % 3600) / 60
        let secs = Int(diff) % 60
        if days > 0 { return "\(days)d \(String(format: "%02d", hrs)):\(String(format: "%02d", mins)):\(String(format: "%02d", secs))" }
        return String(format: "%02d:%02d:%02d", hrs, mins, secs)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if appState.isOffline {
                    OfflineBanner()
                }

                if isFilingWindowOpen {
                    ReportingWindowBanner()
                }

                if isFiledThisWindow {
                    ReportFiledBanner()
                }

                paymentCard
                paymentProgress
                statsGrid
                paidToggle
                dateCard
                ApplicationTimelinesCard(pwdSteps: pwdSteps, dtcSteps: dtcSteps)
                craPayments

                if !appState.statusMessages.isEmpty {
                    messagesPreview
                }
            }
            .padding()
        }
        .safeAreaPadding(.bottom, 90)
        .refreshable { await appState.refreshDashboard() }
        .task { await appState.loadDashboardIfNeeded() }
        .onReceive(ticker) { now = $0 }
        .navigationTitle("Home")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { appState.selectedTabIndex = 4 } label: {
                    AvatarView(size: 32)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var isFilingWindowOpen: Bool {
        Calendar.current.component(.day, from: now) <= 5 && !appState.isCurrentMonthFiled
    }

    private var isFiledThisWindow: Bool {
        Calendar.current.component(.day, from: now) <= 5 && appState.isCurrentMonthFiled
    }

    private var paymentCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("NEXT PAYMENT")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.secondary)

            Text(appState.paymentAmountText)
                .font(.system(size: 52, weight: .bold))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .contentTransition(.numericText())

            if let days = appState.daysUntilPayment {
                Text("in \(days) days")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Color.talliOrange)
            }

            Text(appState.nextPaymentDateText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var paymentProgress: some View {
        GeometryReader { geo in
            let days = Double(appState.daysUntilPayment ?? 28)
            let pct = CGFloat(max(0, min(1, (28 - days) / 28)))
            let fillW = geo.size.width * pct
            ZStack(alignment: .leading) {
                Capsule().fill(Color(.tertiarySystemFill)).frame(height: 3)
                Capsule().fill(Color.talliOrange).frame(width: max(0, fillW), height: 3)
                Circle()
                    .fill(Color.talliOrange)
                    .frame(width: 7, height: 7)
                    .offset(x: max(0, fillW - 3.5), y: 0)
            }
        }
        .frame(height: 7)
    }

    private var statsGrid: some View {
        HStack(spacing: 12) {
            statCell(label: "MONTHLY", value: appState.paymentAmountText)
            statCell(label: "NEXT PAYMENT", value: appState.nextPaymentDateText)
        }
    }

    private func statCell(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .minimumScaleFactor(0.8)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }

    private var paidToggle: some View {
        HStack(spacing: 12) {
            Button {
                Task { await appState.togglePaid() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: appState.isPaid ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(appState.isPaid ? Color.talliOrange : .secondary)
                    Text(appState.isPaid ? "Paid" : "Paid yet?")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(appState.isPaid ? Color.talliOrange : .primary)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(Capsule().strokeBorder(appState.isPaid ? Color.talliOrange.opacity(0.5) : Color.secondary.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private var dateCard: some View {
        VStack(spacing: 12) {
            PaymentCalendarView(paymentDate: appState.parsedNextPaymentDate, today: now)

            HStack {
                Text(appState.nextPaymentDateText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(liveCountdownText)
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .contentTransition(.numericText())
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color(.secondarySystemGroupedBackground)))
    }

    private var pwdSteps: [(label: String, date: String, done: Bool)] {
        [
            ("Application submitted", "Jan 14, 2026", true),
            ("Medical review", "Complete", true),
            ("Decision", "Denied May 2026 -- Resubmission in progress", false),
            ("Backdated payments", "Upon approval", false)
        ]
    }

    private var dtcSteps: [(label: String, date: String, done: Bool)] {
        [
            ("Application submitted", "April 2026", true),
            ("CRA processing", "Expected 8-12 weeks", false),
            ("Decision", "Pending", false),
            ("Credit applied retroactively", "Pending", false)
        ]
    }

    private var craPayments: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("CRA BENEFITS")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(.secondary)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("GST/HST Credit")
                        .font(.subheadline.weight(.medium))
                    Text("June 5, 2026")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text("$174.50")
                    .font(.subheadline.weight(.semibold))
            }

            Text("4 payments per year. Not all CRA credits shown.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }

    private var messagesPreview: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Status Messages")
                .font(.headline)

            ForEach(appState.statusMessageItems.prefix(3)) { message in
                Text("-- \(message.text)")
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }
}

private struct OfflineBanner: View {
    var body: some View {
        HStack {
            Text("Offline").font(.caption.weight(.semibold))
            Spacer()
            Text("Showing last saved data").font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ReportingWindowBanner: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Color.talliOrange)
            VStack(alignment: .leading, spacing: 2) {
                Text("Report window open")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.talliOrange)
                Text("Closes the 5th")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Already filed") {
                Task { await appState.markMonthFiled() }
            }
            .font(.caption.weight(.semibold))
            .buttonStyle(.bordered)
            .controlSize(.mini)
        }
        .padding(12)
        .background(Color.talliOrange.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.talliOrange.opacity(0.3), lineWidth: 1))
    }
}

private struct ReportFiledBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Report filed this month")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.green)
            Spacer()
        }
        .padding(12)
        .background(Color.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.green.opacity(0.3), lineWidth: 1))
    }
}

#Preview {
    ContentView()
        .environment(AppState())
}
