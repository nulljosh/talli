import SwiftUI

struct BenefitsView: View {
    private let benefits: [(name: String, status: String, active: Bool)] = [
        ("Disability Assistance", "PWD", true),
        ("Shelter Allowance", "Active", true),
        ("MSP", "Active", true),
        ("PharmaCare", "Plan G", true),
        ("BC Bus Pass", "Annual", true),
        ("GST/HST Credit", "Quarterly", true),
        ("Climate Action", "Quarterly", true),
        ("BC Affordability", "Annual", true)
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("YOURS")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(benefits, id: \.name) { benefit in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(benefit.active ? Color.bcBlue : .secondary)
                            .frame(width: 6, height: 6)

                        Text(benefit.name)
                            .font(.caption2)
                            .lineLimit(1)

                        Spacer()

                        Text(benefit.status)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 4)
        }
    }
}
