import SwiftUI

struct MacBenefitsView: View {
    @Environment(MacAppState.self) private var appState

    /// This person's actual monthly income, above the static rate catalogue below.
    /// The catalogue is reference material; this is real data, and it must match
    /// what web and iOS show (all three derive from deriveIncome() server-side).
    @ViewBuilder
    private var incomeCard: some View {
        if let income = appState.dashboard?.income {
            VStack(alignment: .leading, spacing: 12) {
                Text("YOUR MONTHLY INCOME")
                    .font(.system(size: 13, weight: .semibold))
                    .ltrTracking(0.5)
                    .foregroundStyle(.secondary)

                HStack(spacing: 16) {
                    incomeCell("PWD", income.pwdMonthly)
                    incomeCell("CDB", income.cdbMonthly)
                    incomeCell("Total", income.totalMonthly)
                }
                if let year = income.yearTotal, let left = income.yearRemaining, let n = income.paymentsLeft, year > 0 {
                    let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))
                    Text("\(year.formatted(cad)) this year at today's rate: \((year - left).formatted(cad)) in, \(left.formatted(cad)) to come")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }

                if let earnings = appState.earnings, let exemption = earnings.exemption, exemption > 0, let earned = earnings.earned, let left = earnings.left, let y = earnings.year {
                    let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))
                    let isOver = (earnings.over ?? 0) > 0
                    Text("Work earnings \(y): \(earned.formatted(cad)) of \(exemption.formatted(cad)), \(left.formatted(cad)) left")
                        .font(.system(size: 13))
                        .foregroundStyle(isOver ? .red : .secondary)
                }

                if let assets = appState.assets, let counted = assets.counted, let limit = assets.limit, let left = assets.left {
                    let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))
                    let isOver = assets.over ?? false
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Assets: \(counted.formatted(cad)) of \(limit.formatted(cad)), \(left.formatted(cad)) left")
                            .font(.system(size: 13))
                            .foregroundStyle(isOver ? .red : .secondary)
                        if let exempt = assets.exempt, exempt > 0 {
                            Text("RDSP \(exempt.formatted(cad)) not counted")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if let review = appState.yearReview, !review.items.isEmpty {
                    let cad = FloatingPointFormatStyle<Double>.Currency(code: "CAD").precision(.fractionLength(0))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(String(review.year))\(review.complete ? "" : " so far"): \(review.totals.all.formatted(cad))")
                            .font(.system(size: 13))
                        Text("\(review.totals.benefits.formatted(cad)) benefits, \(review.totals.credits.formatted(cad)) credits, \(review.totals.earnings.formatted(cad)) work earnings")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                        ShareLink(item: review.csvFile()) {
                            Label("Export for tax time", systemImage: "square.and.arrow.up")
                        }
                        .font(.system(size: 13))
                    }
                }
            }
            .macGlassCard()
        }
    }

    private func incomeCell(_ label: String, _ amount: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Text(amount.formatted(.currency(code: "CAD").precision(.fractionLength(0))))
                .font(.system(size: 22, weight: .semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                statusCard
                incomeCard

                section("Tools") { group(tools) }
                section("Help and papers") { group(papers) }

                section("From your tax return", note: "File your taxes first. These are worked out from your return.") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 16, alignment: .top)], spacing: 16) {
                        ForEach(benefits, id: \.title) { benefitCard($0) }
                    }
                }

                section("Apply separately") {
                    VStack(spacing: 0) {
                        ForEach(Array(applyRows.enumerated()), id: \.offset) { i, row in
                            if i > 0 { Divider().padding(.leading, 16) }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row.0).font(.system(size: 15, weight: .semibold))
                                Text(row.1).font(.system(size: 13)).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 16)
                        }
                    }
                    .macGlassCard(padding: 0)
                }
            }
            .frame(maxWidth: 960)
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Pieces

    // Same summary as the web Status tab. PWD and CDB count as approved; there is no button for it.
    private var statusCard: some View {
        HStack(spacing: 16) {
            Image(systemName: "checkmark")
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(Color.bcPrimary, in: Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text("Active, receiving benefits").font(.system(size: 17, weight: .semibold))
                Text("PWD approved · CDB approved").font(.system(size: 15)).foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Text("Approved")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.bcPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Color.bcPrimary.opacity(0.12), in: Capsule())
        }
        .macGlassCard()
    }

    private func section(_ title: LocalizedStringKey, note: LocalizedStringKey? = nil, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 22, weight: .semibold))
                if let note { Text(note).font(.system(size: 15)).foregroundStyle(.secondary) }
            }
            .padding(.bottom, 4)
            content()
        }
    }

    // Tools open as rows in an inset grouped list, never nested folds. Each pushes its own page.
    private struct Tool { let title: LocalizedStringKey; let symbol: String; let view: AnyView }

    private var tools: [Tool] {
        let api = MacAPIClient.shared
        return [
            Tool(title: "Money in and out", symbol: "list.bullet.rectangle", view: AnyView(MoneyLogView { try await api.moneyLog(save: $0) })),
            Tool(title: "Budget against paydays", symbol: "chart.bar", view: AnyView(BudgetView { try await api.budget(save: $0) })),
            Tool(title: "Benefit finder", symbol: "magnifyingglass", view: AnyView(BenefitFinderView { try await api.benefitFinder(answers: $0) })),
            Tool(title: "RDSP grants and bonds", symbol: "banknote", view: AnyView(RdspTrackerView { try await api.rdspTracker(patch: $0) })),
            Tool(title: "What if I take a job", symbol: "briefcase", view: AnyView(WhatIfView { try await api.whatIf($0) })),
            Tool(title: "My household and rent", symbol: "house", view: AnyView(HouseholdView { try await api.household(save: $0) })),
        ]
    }

    private var papers: [Tool] {
        let api = MacAPIClient.shared
        return [
            Tool(title: "Turning 65 or moving out of BC", symbol: "calendar", view: AnyView(LifeChangeView { try await api.lifeChange(save: $0) })),
            Tool(title: "Reconsideration helper", symbol: "arrow.uturn.backward", view: AnyView(ReconsiderationView { try await api.reconsideration(received: $0) })),
            Tool(title: "Service requests", symbol: "tray", view: AnyView(ServiceRequestsView { try await api.serviceRequests() })),
            Tool(title: "Document vault", symbol: "lock", view: AnyView(VaultView(api: api.vault))),
            Tool(title: "Trusted helper", symbol: "person.2", view: AnyView(TrustedHelperView(api: api.trustedHelpers))),
        ]
    }

    private func group(_ items: [Tool]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, tool in
                if i > 0 { Divider().padding(.leading, 48) }
                NavigationLink {
                    ScrollView { tool.view.frame(maxWidth: 680).padding(.horizontal, 20).padding(.vertical, 24).frame(maxWidth: .infinity) }
                        .navigationTitle(tool.title)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: tool.symbol)
                            .font(.system(size: 15))
                            .foregroundStyle(Color.bcPrimary)
                            .frame(width: 20)
                        Text(tool.title).font(.system(size: 15))
                        Spacer(minLength: 8)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 16)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .macGlassCard(padding: 0)
    }

    private struct Benefit { let title: String; let kind: String; let rows: [(String, String)]; let note: String }

    private let benefits = [
        Benefit(title: "GST/HST Credit", kind: "Automatic", rows: [("Single", "$533/yr"), ("Couple", "$698/yr"), ("Per child", "+$184/yr")],
                note: "Paid every quarter. Up 25 percent for good from July 2026."),
        Benefit(title: "Canada Child Benefit", kind: "Automatic", rows: [("Under 6", "$7,997/yr"), ("6 to 17", "$6,748/yr"), ("Disability", "+$3,411/yr")],
                note: "Tax-free, paid monthly."),
        Benefit(title: "BC Family Benefit", kind: "Automatic", rows: [("First child", "$1,750/yr"), ("Second child", "$1,100/yr"), ("Single parent", "up to $500/yr")],
                note: "Comes with the Canada Child Benefit. Full amount under $29,526 income."),
        Benefit(title: "BC Renter's Tax Credit", kind: "Claim on return", rows: [("Maximum", "$400/yr"), ("Phases out from", "$64,764")],
                note: "You must have rented for 6 months or more."),
        Benefit(title: "Canada Workers Benefit", kind: "Claim on return", rows: [("Single", "$1,633/yr"), ("Family", "$2,813/yr"), ("Disability", "+$843/yr")],
                note: "Schedule 6. For working income over $3,000."),
        Benefit(title: "Canadian Dental Care Plan", kind: "Apply", rows: [("Under $70K", "Free"), ("$70K to $80K", "40% co-pay"), ("$80K to $90K", "60% co-pay")],
                note: "Apply through the CRA. Not if you have private dental."),
    ]

    private func benefitCard(_ b: Benefit) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(b.title).font(.system(size: 17, weight: .semibold))
                Spacer(minLength: 8)
                Text(b.kind).font(.system(size: 13)).foregroundStyle(.secondary)
            }
            VStack(spacing: 8) {
                ForEach(b.rows, id: \.0) { row in
                    HStack {
                        Text(row.0).foregroundStyle(.secondary)
                        Spacer(minLength: 8)
                        Text(row.1).fontWeight(.medium)
                    }
                    .font(.system(size: 15))
                }
            }
            Text(b.note)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .macGlassCard()
    }

    private let applyRows = [
        ("National Pharmacare", "Free diabetes, hormone and contraceptive medicine"),
        ("Fair PharmaCare", "Prescription coverage based on income"),
        ("SAFER", "Rent help for renters 60 and over"),
        ("RAP", "Rent help for families, about $700 a month on average"),
        ("BC Bus Pass", "$45 a year transit for PWD and GIS seniors"),
    ]
}
