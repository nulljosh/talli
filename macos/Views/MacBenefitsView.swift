import SwiftUI

struct MacBenefitsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                philosophyCard
                callToAction

                // Automatic benefits
                benefitCard(
                    title: "GST/HST Credit",
                    difficulty: "Automatic",
                    color: Color(red: 52/255, green: 199/255, blue: 89/255),
                    rows: [("Single", "$533/yr"), ("Couple", "$698/yr"), ("Per child", "+$184/yr")],
                    how: "Auto -- file your tax return. Quarterly payments.",
                    note: "25% permanent increase starting Jul 2026."
                )
                benefitCard(
                    title: "Canada Child Benefit",
                    difficulty: "Automatic",
                    color: .red,
                    rows: [("Under 6", "$7,997/yr"), ("6 to 17", "$6,748/yr"), ("Disability +", "+$3,411/yr")],
                    how: "Auto -- file your tax return.",
                    note: "Tax-free, paid monthly."
                )
                benefitCard(
                    title: "BC Family Benefit",
                    difficulty: "Automatic",
                    color: Color(red: 78/255, green: 205/255, blue: 196/255),
                    rows: [("1st child", "$1,750/yr"), ("2nd child", "$1,100/yr"), ("Single-parent", "up to $500/yr")],
                    how: "Auto if registered for CCB.",
                    note: "Full amount under $29,526 income."
                )

                // Claim on return
                benefitCard(
                    title: "BC Renter's Tax Credit",
                    difficulty: "Claim on return",
                    color: .red,
                    rows: [("Maximum", "$400/yr"), ("Phase-out", "starts $64,764")],
                    how: "Claim on tax return.",
                    note: "Must have rented 6+ months."
                )
                benefitCard(
                    title: "Canada Workers Benefit",
                    difficulty: "Claim on return",
                    color: .orange,
                    rows: [("Single", "$1,633/yr"), ("Family", "$2,813/yr"), ("Disability +", "+$843/yr")],
                    how: "Claim on tax return (Schedule 6).",
                    note: "Working income > $3,000."
                )

                // Application
                benefitCard(
                    title: "Canadian Dental Care Plan",
                    difficulty: "Application required",
                    color: Color.bcPrimary,
                    rows: [("Under $70K", "Free"), ("$70K-$80K", "40% co-pay"), ("$80K-$90K", "60% co-pay")],
                    how: "Apply through CRA. Must not have private dental.",
                    note: "Covers preventive, basic, and major dental."
                )

                mustApplySection
            }
            .padding(24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private var philosophyCard: some View {
        Text("Everything below is money allocated for you. Not charity. Not a handout. Collecting it is rational.")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .macGlassCard()
    }

    private var callToAction: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("File Your Taxes First")
                .font(.title3.weight(.semibold))
            Text("Most benefits are calculated automatically from your tax return. No separate application needed.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.bcPrimary.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Color.bcPrimary.opacity(0.2), lineWidth: 0.5)
                )
        }
    }

    private func benefitCard(title: String, difficulty: String, color: Color, rows: [(String, String)], how: String, note: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Circle().fill(color).frame(width: 10, height: 10)
                Text(title).font(.headline)
                Spacer()
                Text(difficulty)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(difficulty == "Automatic" ? .green : difficulty == "Claim on return" ? .orange : .red)
            }

            ForEach(rows, id: \.0) { row in
                HStack {
                    Text(row.0).font(.subheadline).foregroundStyle(.secondary)
                    Spacer()
                    Text(row.1).font(.subheadline.weight(.semibold))
                }
            }

            Text(how)
                .font(.caption.weight(.medium))
                .foregroundStyle(color)

            Text(note)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
        )
    }

    private var mustApplySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("MUST APPLY SEPARATELY")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
                .kerning(0.5)

            applyRow("National Pharmacare", desc: "Free diabetes/hormone/contraceptive meds", color: .green)
            applyRow("Fair PharmaCare", desc: "Income-based prescription coverage", color: .green)
            applyRow("SAFER", desc: "Rent subsidy for 60+ renters", color: .yellow)
            applyRow("RAP", desc: "Rent subsidy for families (~$700/mo avg)", color: .orange)
            applyRow("BC Bus Pass", desc: "$45/yr transit for PWD/GIS seniors", color: Color.bcPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
        )
    }

    private func applyRow(_ title: String, desc: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Circle().fill(color).frame(width: 8, height: 8).padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold))
                Text(desc).font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }
}
