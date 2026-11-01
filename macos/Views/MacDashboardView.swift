import SwiftUI

struct MacDashboardView: View {
    @Environment(MacAppState.self) private var appState
    @State private var showDetails = false
    /// The window's content size, for the hero; set by the GeometryReader around the scroll view.
    @State private var viewport: CGSize = .zero

    var body: some View {
        GeometryReader { geo in
        ScrollViewReader { scroller in
        ScrollView {
            VStack(spacing: 16) {
                if appState.isOffline {
                    offlineBanner
                } else if appState.isSyncStale {
                    staleSyncBanner
                }

                if appState.isFilingWindowOpen && !appState.isCurrentMonthFiled {
                    filingWindowBanner
                } else if appState.isFilingWindowOpen && appState.isCurrentMonthFiled {
                    reportFiledBanner
                }

                MissedPaymentView(
                    fetch: { try await MacAPIClient.shared.missedPayment() },
                    arrived: { try? await MacAPIClient.shared.markPaid(month: $0) }
                )

                // The first screen is the number, centred, with one quiet action under it.
                VStack(spacing: 24) {
                    paymentCard
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) { showDetails.toggle() }
                        if showDetails { withAnimation { scroller.scrollTo("details", anchor: .top) } }
                    } label: {
                        Label(showDetails ? "Hide details" : "Details", systemImage: showDetails ? "chevron.up" : "chevron.down")
                    }
                    .capsuleAction(prominent: false)
                }
                .frame(maxHeight: .infinity)
                .containerRelativeFrame(.vertical) { length, _ in length - 48 }

                if showDetails {
                    VStack(spacing: 16) {
                        calendarCard
                        if !appState.statusMessages.isEmpty {
                            recentMessagesCard
                        }
                    }
                    .id("details")
                }
            }
            .frame(maxWidth: 960)
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .onAppear { viewport = geo.size }
        .onChange(of: geo.size) { _, size in viewport = size }
        }
    }

    // MARK: - Payment Card

    // Same hero as the web dashboard: bold system figures up to half the window tall, the $ small and raised.
    private var paymentCard: some View {
        VStack(spacing: 8) {
            Text("NEXT PAYMENT")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
                .ltrTracking(0.5)
                .padding(.bottom, 8)

            HeroAmountView(
                digits: appState.paymentAmountText.replacingOccurrences(of: ".00", with: "").replacingOccurrences(of: "$", with: ""),
                width: max(0, min(viewport.width - 40, 960)),
                maxHeight: viewport.height * 0.5
            )

            Text(appState.countdownText)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(Color.bcLight)
                .padding(.top, 16)

            Text(appState.nextPaymentDateText)
                .font(.system(size: 15))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Calendar

    private var calendarCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            MacPaymentCalendarView(paymentDate: appState.parsedNextPaymentDate)
            Divider()
            SupplementsView { try await MacAPIClient.shared.supplements(save: $0) }
        }
        .macGlassCard()
    }

    // MARK: - Recent Messages

    private var recentMessagesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.bcPrimary)
                Text("Recent messages")
                    .font(.system(size: 17, weight: .semibold))
                Spacer()
                Text("\(appState.statusMessages.count) total")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Divider()

            ForEach(appState.statusMessages.prefix(3)) { message in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(Color.bcLight)
                        .frame(width: 6, height: 6)
                        .padding(.top, 6)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(message.text)
                            .font(.subheadline)
                            .lineLimit(2)
                        if let ts = message.timestamp, let date = MacDateParsing.parse(ts) {
                            Text(date.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .macGlassCard()
    }

    // MARK: - Shared

    private var filingWindowBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Color.orange)
            VStack(alignment: .leading, spacing: 4) {
                Text("Report window open")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.orange)
                Text("Closes the 5th")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Already filed") {
                Task { await appState.markMonthFiled() }
            }
            .font(.caption.weight(.semibold))
            .controlSize(.small)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var reportFiledBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color.green)
            Text("Report filed this month")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.green)
            Spacer()
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(Color.green.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var staleSyncBanner: some View {
        HStack {
            Image(systemName: "clock.arrow.circlepath")
                .font(.caption)
            Text(appState.lastSyncDate.map {
                "Not up to date. Last synced \($0.formatted(.relative(presentation: .named)))"
            } ?? "Not up to date. Never synced.")
                .font(.caption)
            Spacer()
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var offlineBanner: some View {
        HStack {
            Image(systemName: "wifi.slash")
                .font(.caption)
            Text("Offline. Showing saved data.")
                .font(.caption)
            Spacer()
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}
