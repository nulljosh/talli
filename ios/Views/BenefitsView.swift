import SwiftUI

struct BenefitsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Active Benefits")
                    .font(.headline)

                Text("Income Assistance")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.primary)

                benefitRow("GST/HST Credit", "\(CRADates.lastKnownGSTQuarterlyText) next \(CRADates.nextGSTPaymentText)", "Automatic")

                DisclosureGroup("RDSP grants and bonds") {
                    RdspTrackerView { try await APIClient.shared.rdspTracker(patch: $0) }
                        .padding(.top, 8)
                }
                .font(.headline)
                .padding(.top, 8)

                DisclosureGroup("What if I take a job") {
                    WhatIfView { try await APIClient.shared.whatIf($0) }
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("Trusted helper") {
                    TrustedHelperView(api: APIClient.shared.trustedHelpers)
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("My household and rent") {
                    HouseholdView { try await APIClient.shared.household(save: $0) }
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("Service requests") {
                    ServiceRequestsView { try await APIClient.shared.serviceRequests() }
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("Reconsideration helper") {
                    ReconsiderationView { try await APIClient.shared.reconsideration(received: $0) }
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("Document vault") {
                    VaultView(api: APIClient.shared.vault)
                        .padding(.top, 8)
                }
                .font(.headline)

                DisclosureGroup("Benefit finder") {
                    BenefitFinderView { try await APIClient.shared.benefitFinder(answers: $0) }
                        .padding(.top, 8)
                }
                .font(.headline)
            }
            .padding()
        }
        .padding(.bottom, 90)
        .navigationTitle("Benefits")
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
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.2), lineWidth: 1))
    }
}
