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

                Text("RDSP grants and bonds")
                    .font(.headline)
                    .padding(.top, 8)
                RdspTrackerView { try await APIClient.shared.rdspTracker(patch: $0) }

                Text("Benefit finder")
                    .font(.headline)
                    .padding(.top, 8)
                BenefitFinderView { try await APIClient.shared.benefitFinder(answers: $0) }
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
