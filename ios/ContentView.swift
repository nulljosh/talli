import SwiftUI
import UIKit

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var showSplash = true

    var body: some View {
        Group {
            if appState.isAuthenticated {
                AuthenticatedTabShell()
            } else {
                NavigationStack { LoginScreen() }
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
            // Each tab owns its NavigationStack: one stack around the TabView hides every toolbar item inside it.
            NavigationStack { DashboardScreen() }
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)
            NavigationStack { StatusView() }
                .tabItem { Label("Status", systemImage: "list.bullet.clipboard.fill") }
                .tag(1)
            NavigationStack { MessagesView() }
                .tabItem { Label("Messages", systemImage: "message.fill") }
                .tag(2)
                .badge(appState.unreadMessageCount)
            NavigationStack { SettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(3)
        }
        .onChange(of: appState.selectedTabIndex) { _, newTab in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            // Every tab stays alive inside this TabView, so onAppear only ever
            // fires once -- opening Messages has to refetch explicitly or the
            // list keeps showing whatever was loaded at launch.
            if newTab == 2 {
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
    @State private var showFederal = false
    @State private var showProvince = false

    var body: some View {
        // Scrolls instead of clipping at large text sizes; the spacers still centre it.
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 20) {
                    Spacer()

                    VStack(spacing: 8) {
                        Image("LaunchIcon")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 72, height: 72)
                        Text("Talli")
                            .font(.largeTitle.bold())
                        Text("Your benefits. No bureaucracy.")
                            .font(.subheadline)
                            .fixedSize(horizontal: false, vertical: true)
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("BCEID USERNAME")
                                .sectionLabel()
                            TextField("your.username", text: $username)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .minimumScaleFactor(0.5)
                                .padding(.horizontal, 20)
                                .frame(minHeight: 48)
                                .background(Color(.secondarySystemGroupedBackground), in: Capsule())
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("PASSWORD")
                                .sectionLabel()
                            SecureField("••••••••", text: $password)
                                .minimumScaleFactor(0.5)
                                .padding(.horizontal, 20)
                                .frame(minHeight: 48)
                                .background(Color(.secondarySystemGroupedBackground), in: Capsule())
                        }
                    }

                    Button {
                        Task { await appState.login(username: username, password: password) }
                    } label: {
                        HStack {
                            if appState.isLoading { ProgressView() }
                            Text("Sign In").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity, minHeight: 48)
                    }
                    .capsuleAction()
                    .tint(Color.talliBlueDeep)
                    .disabled(username.isEmpty || password.isEmpty || appState.isLoading)

                    if let error = appState.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button { showFederal = true } label: {
                        Text("Federal benefits, no account needed")
                            .font(.footnote)
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .tint(Color.talliLink)
                    Button { showProvince = true } label: {
                        Text("Alberta or Ontario? See your rules")
                            .font(.footnote)
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .tint(Color.talliLink)

                    Spacer()
                }
                .padding(24)
                .frame(minHeight: geo.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .background(Color(.systemBackground).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showFederal) {
            NavigationStack {
                ScrollView { BenefitFinderView { try await APIClient.shared.federalFinder(answers: $0) }.padding(20) }
                    .navigationTitle("Federal benefits")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { Button("Done") { showFederal = false } }
            }
        }
        .sheet(isPresented: $showProvince) {
            NavigationStack {
                ScrollView { ProvinceView { try await APIClient.shared.provinces() }.padding(20) }
                    .navigationTitle("Outside BC")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { Button("Done") { showProvince = false } }
            }
        }
    }
}

private struct TimelineCard: View {
    let title: String
    let steps: [(label: String, date: String, done: Bool)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .ltrTracking(1.5)
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
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
    }
}

private struct DashboardScreen: View {
    @Environment(AppState.self) private var appState
    @State private var now = Date()
    /// The screen's content size, for the hero amount.
    @State private var viewport: CGSize = .zero

    var body: some View {
        GeometryReader { geo in
        ScrollView {
            VStack(spacing: 24) {
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

                MissedPaymentView(
                    fetch: { try await APIClient.shared.missedPayment() },
                    arrived: { await appState.markPaid(month: $0) }
                )

                // One number, one line, one action, then what is worth a glance. No forced empty band.
                VStack(alignment: .leading, spacing: 24) {
                    paymentCard
                    if appState.daysUntilPayment != nil {
                        paymentProgress
                    }
                    paidToggle
                }
                .padding(.top, 8)

                incomeTiles

                dateCard

                incomeBreakdown
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        // grouped background so the white cards read as cards in light mode
        .background(Color(.systemGroupedBackground))
        .onAppear { viewport = geo.size }
        .onChange(of: geo.size) { _, size in viewport = size }
        }
        .refreshable { await appState.refreshDashboard() }
        .task {
            now = Date()
            await appState.loadDashboardIfNeeded()
        }
        // no title: the tab bar already says Home, and the number is the headline
        .navigationBarTitleDisplayMode(.inline)
    }

    private var isFilingWindowOpen: Bool {
        !appState.pwdApproved && Calendar.current.component(.day, from: now) <= 5 && !appState.isCurrentMonthFiled
    }

    private var isFiledThisWindow: Bool {
        !appState.pwdApproved && Calendar.current.component(.day, from: now) <= 5 && appState.isCurrentMonthFiled
    }

    // Same hero as web and Mac: bold system figures up to half the screen tall, the $ small and raised.
    private var paymentCard: some View {
        VStack(spacing: 8) {
            Text("NEXT PAYMENT")
                .font(.system(size: 13, weight: .semibold))
                .ltrTracking(1.5)
                .foregroundStyle(.secondary)
                .padding(.bottom, 8)

            HeroAmountView(
                digits: appState.paymentAmountText.replacingOccurrences(of: ".00", with: "").replacingOccurrences(of: "$", with: ""),
                width: max(0, viewport.width - 40),
                maxHeight: viewport.height * 0.5
            )
            .padding(.bottom, 8)

            if let days = appState.daysUntilPayment {
                Group {
                    switch days {
                    case 0: Text("Today")
                    case 1: Text("Tomorrow")
                    default: Text("in \(days) days")
                    }
                }
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(Color.talliBlue)
            }

            Text(appState.nextPaymentDateText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    /// PWD + CDB breakdown, mirroring the web dashboard's Bennies income block so
    /// the platforms agree. Hidden entirely when the server sends no income block.
    /// PWD, CDB and total at a glance, right under the hero.
    @ViewBuilder
    private var incomeTiles: some View {
        if let income = appState.income {
            HStack(spacing: 12) {
                incomeCell(label: "PWD", value: appState.moneyText(income.pwdMonthly))
                incomeCell(label: "CDB", value: appState.moneyText(income.cdbMonthly))
                incomeCell(label: "TOTAL", value: appState.moneyText(income.totalMonthly))
            }
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
        }
    }

    @ViewBuilder
    private var incomeBreakdown: some View {
        if appState.income != nil {
            DisclosureGroup("Details") {
            VStack(alignment: .leading, spacing: 12) {
                if let income = appState.income, let year = income.yearTotal, let left = income.yearRemaining, let n = income.paymentsLeft, year > 0 {
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

                if let assets = appState.assets, let counted = assets.counted, let limit = assets.limit, let left = assets.left {
                    let isOver = assets.over ?? false
                    HStack {
                        Text("Assets").foregroundStyle(.secondary)
                        Spacer()
                        Text("\(appState.moneyText(counted)) of \(appState.moneyText(limit)), \(appState.moneyText(left)) left").fontWeight(.semibold).foregroundStyle(isOver ? .red : .primary)
                    }
                    .font(.footnote)
                    if let exempt = assets.exempt, exempt > 0 {
                        Text("RDSP \(appState.moneyText(exempt)) not counted").font(.caption).foregroundStyle(.secondary)
                    }
                }

                if let review = appState.yearReview, !review.items.isEmpty {
                    HStack {
                        Text("\(String(review.year)) in review\(review.complete ? "" : " so far")").foregroundStyle(.secondary)
                        Spacer()
                        Text(appState.moneyText(review.totals.all)).fontWeight(.semibold)
                    }
                    .font(.footnote)
                    Text("\(appState.moneyText(review.totals.benefits)) benefits, \(appState.moneyText(review.totals.credits)) credits, \(appState.moneyText(review.totals.earnings)) work earnings")
                        .font(.caption).foregroundStyle(.secondary)
                    ShareLink(item: review.csvFile()) {
                        Label("Export for tax time", systemImage: "square.and.arrow.up")
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
            .padding(.top, 12)
            }
            .font(.subheadline.weight(.medium))
            .tint(.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(.secondarySystemGroupedBackground)))
        }
    }

    private func incomeCell(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .ltrTracking(1.2)
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
        Button {
            Task { await appState.togglePaid() }
        } label: {
            Label(LocalizedStringKey(appState.isPaid ? "Paid" : "Paid yet?"),
                  systemImage: appState.isPaid ? "checkmark.circle.fill" : "circle")
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
        }
        // prominent until it lands, then it steps back
        .capsuleAction(prominent: !appState.isPaid)
        .tint(Color.talliBlue)
    }

    private var dateCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            PaymentCalendarView(paymentDate: appState.parsedNextPaymentDate, today: now)
            Divider()
            SupplementsView { try await APIClient.shared.supplements(save: $0) }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous)
            .fill(Color(.secondarySystemGroupedBackground)))
    }

}
