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
        TabView(selection: Binding(
            get: { appState.selectedTabIndex },
            set: { appState.selectedTabIndex = $0 }
        )) {
            DashboardScreen()
                .tabItem {
                    Label("Home", systemImage: "house")
                }
                .tag(0)

            ReportView()
                .tabItem {
                    Label("Reports", systemImage: "doc.text")
                }
                .tag(1)

            BenefitsView()
                .tabItem {
                    Label("Benefits", systemImage: "accessibility")
                }
                .tag(2)

            if !appState.statusMessageItems.isEmpty {
                MessagesView()
                    .tabItem {
                        Label("Messages", systemImage: "envelope")
                    }
                    .tag(3)
                    .badge(appState.unreadMessageCount)
            }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(4)
        }
        .tint(Color.tallyOrange)
        .onChange(of: appState.selectedTabIndex) { _, newTab in
            if newTab == 3, appState.unreadMessageCount > 0 {
                Task { await appState.markAllMessagesRead() }
            }
        }
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
                Image(systemName: "chart.bar.doc.horizontal")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.tallyOrange)
                Text("Tally")
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
                .background(Color.tallyOrange, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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

    private var earningsRateText: String? {
        guard let date = appState.parsedNextPaymentDate, let amount = appState.parsedPaymentAmount else { return nil }
        let target = Calendar.current.startOfDay(for: date)
        let hoursLeft = max(0, target.timeIntervalSince(now)) / 3600
        guard hoursLeft > 0 else { return nil }
        return String(format: "$%.2f/hr", amount / hoursLeft)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if appState.isOffline {
                    OfflineBanner()
                }

                paymentCard
                paymentProgress
                statsGrid
                paidToggle
                dateCard
                TimelineCard(title: "PWD APPLICATION", steps: pwdSteps)
                TimelineCard(title: "DTC APPLICATION", steps: dtcSteps)
                craPayments

                if !appState.statusMessages.isEmpty {
                    messagesPreview
                }
            }
            .padding()
        }
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
                    .foregroundStyle(Color.tallyOrange)
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
                Capsule().fill(Color.tallyOrange).frame(width: max(0, fillW), height: 3)
                Circle()
                    .fill(Color.tallyOrange)
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
                        .foregroundStyle(appState.isPaid ? Color.tallyOrange : .secondary)
                    Text(appState.isPaid ? "Paid" : "Paid yet?")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(appState.isPaid ? Color.tallyOrange : .primary)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(Capsule().strokeBorder(appState.isPaid ? Color.tallyOrange.opacity(0.5) : Color.secondary.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private var dateCard: some View {
        VStack(spacing: 12) {
            PaymentCalendarView(paymentDate: appState.parsedNextPaymentDate)

            HStack {
                Text(appState.nextPaymentDateText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(appState.countdownText)
                    .font(.subheadline.weight(.bold))
            }
            HStack {
                Text("Countdown")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(liveCountdownText)
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .contentTransition(.numericText())
            }
            if let rate = earningsRateText {
                HStack {
                    Text("Earning")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(rate)
                        .font(.subheadline.weight(.bold))
                        .contentTransition(.numericText())
                }
                Text("payment amount / hours remaining -- increases as date approaches")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color(.secondarySystemGroupedBackground)))
    }

    private var pwdSteps: [(label: String, date: String, done: Bool)] {
        [
            ("Application submitted", "March 4, 2026", true),
            ("Sorted -- decision due", "Week 8 of ~8 -- expected by May 2026", true),
            ("Decision", "Pending", false),
            ("Payment adjustment", "Pending", false)
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

#Preview {
    ContentView()
        .environment(AppState())
}
