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
            if !appState.pwdApproved {
                ReportView()
                    .tabItem { Label("Reports", systemImage: "list.bullet.clipboard.fill") }
                    .tag(1)
            }
            BenefitsView()
                .tabItem { Label("Benefits", systemImage: "heart.text.clipboard.fill") }
                .tag(2)
            MessagesView()
                .tabItem { Label("Messages", systemImage: "message.fill") }
                .tag(3)
                .badge(appState.unreadMessageCount)
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(4)
        }
        .onChange(of: appState.selectedTabIndex) { _, newTab in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            // Every tab stays alive inside this TabView, so onAppear only ever
            // fires once -- opening Messages has to refetch explicitly or the
            // list keeps showing whatever was loaded at launch.
            if newTab == 3 {
                Task { await appState.refreshDashboard() }
            }
        }
        .tint(Color.talliBlue)
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
                .background(Color.talliBlue, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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
        .background(Color(.systemBackground).ignoresSafeArea())
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
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }
}

private struct DashboardScreen: View {
    @Environment(AppState.self) private var appState
    @State private var now = Date()

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if appState.isOffline {
                    OfflineBanner()
                } else if appState.isSyncStale {
                    StaleSyncBanner()
                }

                if isFilingWindowOpen {
                    ReportingWindowBanner()
                }

                if isFiledThisWindow {
                    ReportFiledBanner()
                }

                paymentCard
                if appState.daysUntilPayment != nil {
                    paymentProgress
                }
                incomeBreakdown
                dateCard
            }
            .padding()
        }
        .refreshable { await appState.refreshDashboard() }
        .task {
            now = Date()
            await appState.loadDashboardIfNeeded()
        }
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
        !appState.pwdApproved && Calendar.current.component(.day, from: now) <= 5 && !appState.isCurrentMonthFiled
    }

    private var isFiledThisWindow: Bool {
        !appState.pwdApproved && Calendar.current.component(.day, from: now) <= 5 && appState.isCurrentMonthFiled
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
                    .foregroundStyle(Color.talliBlue)
            }

            Text(appState.nextPaymentDateText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .overlay(alignment: .topTrailing) { paidToggle.padding(12) }
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }

    /// PWD + CDB breakdown, mirroring the web dashboard's Bennies income block so
    /// the platforms agree. Hidden entirely when the server sends no income block.
    @ViewBuilder
    private var incomeBreakdown: some View {
        if let income = appState.income {
            VStack(alignment: .leading, spacing: 8) {
                Text("MONTHLY INCOME")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1.5)
                    .foregroundStyle(.secondary)

                HStack(spacing: 12) {
                    incomeCell(label: "PWD", value: appState.moneyText(income.pwdMonthly))
                    incomeCell(label: "CDB", value: appState.moneyText(income.cdbMonthly))
                    incomeCell(label: "TOTAL", value: appState.moneyText(income.totalMonthly))
                }

                if let year = income.yearTotal, let left = income.yearRemaining, let n = income.paymentsLeft, year > 0 {
                    HStack {
                        Text("This year").foregroundStyle(.secondary)
                        Spacer()
                        Text("\(appState.moneyText(year)) at today's rate: \(appState.moneyText(year - left)) in, \(appState.moneyText(left)) to come").fontWeight(.semibold)
                    }
                    .font(.footnote)
                }

                if let earnings = appState.earnings, let exemption = earnings.exemption, exemption > 0, let earned = earnings.earned, let left = earnings.left, let y = earnings.year {
                    let isOver = (earnings.over ?? 0) > 0
                    HStack {
                        Text("Work earnings \(y)").foregroundStyle(.secondary)
                        Spacer()
                        Text("\(appState.moneyText(earned)) of \(appState.moneyText(exemption)), \(appState.moneyText(left)) left").fontWeight(.semibold).foregroundStyle(isOver ? .red : .primary)
                    }
                    .font(.footnote)
                }

                ForEach(appState.incomeRates, id: \.label) { rate in
                    HStack {
                        Text(rate.label).foregroundStyle(.secondary)
                        Spacer()
                        Text(rate.value).fontWeight(.semibold)
                    }
                    .font(.footnote)
                }
                if let comparison = appState.minimumWageComparisonText {
                    Text(comparison)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
        }
    }

    private func incomeCell(label: String, value: String) -> some View {
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
    }

    private var paymentProgress: some View {
        GeometryReader { geo in
            let days = Double(appState.daysUntilPayment ?? 28)
            let pct = CGFloat(max(0, min(1, (28 - days) / 28)))
            let fillW = geo.size.width * pct
            ZStack(alignment: .leading) {
                Capsule().fill(Color(.tertiarySystemFill)).frame(height: 3)
                Capsule().fill(Color.talliBlue).frame(width: max(0, fillW), height: 3)
                Circle()
                    .fill(Color.talliBlue)
                    .frame(width: 7, height: 7)
                    .offset(x: max(0, fillW - 3.5), y: 0)
            }
        }
        .frame(height: 7)
    }

    private var paidToggle: some View {
        HStack(spacing: 12) {
            Button {
                Task { await appState.togglePaid() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: appState.isPaid ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(appState.isPaid ? Color.talliBlue : .secondary)
                    Text(LocalizedStringKey(appState.isPaid ? "Paid" : "Paid yet?"))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(appState.isPaid ? Color.talliBlue : .primary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Capsule().strokeBorder(appState.isPaid ? Color.talliBlue.opacity(0.5) : Color.secondary.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private var dateCard: some View {
        PaymentCalendarView(paymentDate: appState.parsedNextPaymentDate, today: now)
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 12)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color(.secondarySystemGroupedBackground)))
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

private struct StaleSyncBanner: View {
    @Environment(AppState.self) private var appState

    private var detail: String {
        guard let date = appState.lastSyncDate else { return "Never synced" }
        return "Last synced \(date.formatted(.relative(presentation: .named)))"
    }

    var body: some View {
        HStack {
            Text("Not up to date").font(.caption.weight(.semibold))
            Spacer()
            Text(detail).font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

private struct ReportingWindowBanner: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Color.talliBlue)
            VStack(alignment: .leading, spacing: 2) {
                Text("Report window open")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.talliBlue)
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
        .background(Color.talliBlue.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.talliBlue.opacity(0.3), lineWidth: 1))
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
