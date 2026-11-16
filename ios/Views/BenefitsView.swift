import SwiftUI

struct BenefitsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        // One inset grouped list: what you get, then every tool one row deep. No nested folds.
        List {
            Section("Active benefits") {
                if let income = appState.income {
                    benefitRow("Disability assistance", appState.moneyText(income.pwdMonthly), "Monthly")
                    if income.cdbMonthly > 0 {
                        benefitRow("Canada Disability Benefit", appState.moneyText(income.cdbMonthly), "Monthly")
                    }
                }
                benefitRow("GST/HST Credit", "\(CRADates.lastKnownGSTQuarterlyText) next \(CRADates.nextGSTPaymentText)", "Automatic")
            }

            Section("Money tools") {
                tool("Money in and out") { MoneyLogView { try await APIClient.shared.moneyLog(save: $0) } }
                tool("Budget against paydays") { BudgetView { try await APIClient.shared.budget(save: $0) } }
                tool("Benefit finder") { BenefitFinderView { try await APIClient.shared.benefitFinder(answers: $0) } }
                tool("RDSP grants and bonds") { RdspTrackerView { try await APIClient.shared.rdspTracker(patch: $0) } }
                tool("What if I take a job") { WhatIfView { try await APIClient.shared.whatIf($0) } }
                tool("My household and rent") { HouseholdView { try await APIClient.shared.household(save: $0) } }
            }

            Section("Help and papers") {
                tool("Turning 65 or moving out of BC") { LifeChangeView { try await APIClient.shared.lifeChange(save: $0) } }
                tool("Reconsideration helper") { ReconsiderationView { try await APIClient.shared.reconsideration(received: $0) } }
                tool("Service requests") { ServiceRequestsView { try await APIClient.shared.serviceRequests() } }
                tool("Document vault") { VaultView(api: APIClient.shared.vault) }
                tool("Trusted helper") { TrustedHelperView(api: APIClient.shared.trustedHelpers) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationBarTitleDisplayMode(.inline)
    }

    /// A tool opens on its own page, padded on the 8 point grid.
    private func tool(_ title: String, @ViewBuilder content: @escaping () -> some View) -> some View {
        NavigationLink(LocalizedStringKey(title)) {
            ScrollView { content().padding(20) }
                .navigationTitle(LocalizedStringKey(title))
                .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func benefitRow(_ title: String, _ amount: String, _ how: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(LocalizedStringKey(title)).font(.subheadline.weight(.medium))
                Text(LocalizedStringKey(how)).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text(LocalizedStringKey(amount)).font(.subheadline.weight(.semibold))
        }
    }
}
