import SwiftUI

struct MacDashboardView: View {
    @Environment(MacAppState.self) private var appState

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if appState.isOffline {
                    offlineBanner
                }

                // Payment hero card
                paymentCard

                HStack(spacing: 16) {
                    countdownCard
                    calendarCard
                }

                if !appState.statusMessages.isEmpty {
                    recentMessagesCard
                }
            }
            .padding(24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Payment Card

    private var paymentCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PAYMENT AMOUNT")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
                .kerning(0.5)

            Text(appState.paymentAmountText)
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(Color.bcPrimary)
                .contentTransition(.numericText())

            HStack(spacing: 8) {
                Text("Next: \(appState.nextPaymentDateText)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("·")
                    .foregroundStyle(.secondary)
                Text(appState.countdownText)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.bcLight)
            }
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

    // MARK: - Countdown

    private var countdownCard: some View {
        VStack(spacing: 8) {
            Text("\(appState.daysUntilPayment)")
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .foregroundStyle(Color.bcPrimary)
            Text("days until payment")
                .font(.caption)
                .foregroundStyle(.secondary)

            progressBar
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(macCard)
    }

    private var progressBar: some View {
        let total = 30.0
        let elapsed = max(0, total - Double(appState.daysUntilPayment))
        let progress = min(1.0, elapsed / total)

        return GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.secondary.opacity(0.15))
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.bcPrimary)
                    .frame(width: geo.size.width * progress)
            }
        }
        .frame(height: 6)
    }

    // MARK: - Calendar

    private var calendarCard: some View {
        MacPaymentCalendarView(paymentDate: appState.parsedNextPaymentDate)
            .frame(maxWidth: .infinity)
            .padding(20)
            .background(macCard)
    }

    // MARK: - Recent Messages

    private var recentMessagesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.bcPrimary)
                Text("Recent Messages")
                    .font(.headline)
                Spacer()
                Text("\(appState.statusMessages.count) total")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            ForEach(appState.statusMessages.prefix(3)) { message in
                HStack(alignment: .top, spacing: 10) {
                    Circle()
                        .fill(Color.bcLight)
                        .frame(width: 6, height: 6)
                        .padding(.top, 6)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(message.text)
                            .font(.subheadline)
                            .lineLimit(2)
                        if let ts = message.timestamp, let date = MacDateParsing.parse(ts) {
                            Text(date.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(macCard)
    }

    // MARK: - Shared

    private var offlineBanner: some View {
        HStack {
            Image(systemName: "wifi.slash")
                .font(.caption)
            Text("Offline -- showing cached data")
                .font(.caption)
            Spacer()
        }
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var macCard: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(.ultraThinMaterial)
            .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
    }
}
