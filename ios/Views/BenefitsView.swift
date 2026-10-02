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
                benefitRow("BC Renter's Tax Credit", "$400/yr max", "Claim on return")
                benefitRow("Canada Workers Benefit", "$1,633/yr single", "Claim on return")
                benefitRow("Canadian Dental Care Plan", "Free under $70K", "Application required")
                benefitRow("National Pharmacare", "Free diabetes/hormone/contraceptive meds", "Application required")
                benefitRow("Fair PharmaCare", "Income-based prescription coverage", "Application required")
                benefitRow("SAFER", "Rent subsidy for 60+ renters", "Application required")
                benefitRow("RAP", "Rent subsidy for families (~$700/mo avg)", "Application required")
                benefitRow("BC Bus Pass", "$45/yr transit for PWD/GIS seniors", "Application required")
                benefitRow("CPP Disability", "If you've worked enough", "Application required")
                benefitRow("CLBC", "Support for significant needs", "Call to check")
                benefitRow("BC Home Renovation Credit", "Up to $1,000 for accessibility", "Claim on return")
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
