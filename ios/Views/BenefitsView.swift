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

                Text("Everything below is money allocated for you. Not charity. Collecting it is rational.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(.ultraThinMaterial))

                benefitRow("GST/HST Credit", "$174.50 next Jun 5", "Automatic")
                benefitRow("BC Renter's Tax Credit", "$400/yr max", "Claim on return")
                benefitRow("Canada Workers Benefit", "$1,633/yr single", "Claim on return")
                benefitRow("Canadian Dental Care Plan", "Free under $70K", "Application required")
            }
            .padding()
        }
        .navigationTitle("Benefits")
    }

    private func benefitRow(_ title: String, _ amount: String, _ how: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.medium))
                Text(how).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text(amount).font(.subheadline.weight(.semibold))
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(Color.secondary.opacity(0.2), lineWidth: 1))
    }
}
