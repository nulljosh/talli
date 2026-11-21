import SwiftUI

// The thin banners above the Home amount: offline, stale sync, the reporting window and a filed report.

@MainActor
struct OfflineBanner: View {
    var body: some View {
        HStack {
            Text("Offline").font(.caption.weight(.semibold))
            Spacer()
            Text("Showing last saved data").font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

@MainActor
struct StaleSyncBanner: View {
    @Environment(AppState.self) private var appState

    private var detail: String {
        guard let date = appState.lastSyncDate else { return "Never synced" }
        return "Last synced \(date.formatted(.relative(presentation: .named)))"
    }

    var body: some View {
        HStack {
            Text("Not up to date").font(.caption.weight(.semibold))
            Spacer()
            Text(detail).font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

@MainActor
struct ReportingWindowBanner: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Color.talliBlue)
            VStack(alignment: .leading, spacing: 2) {
                Text("Report window open")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.talliBlue)
                Text("Closes the 5th")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Already filed") {
                Task { await appState.markMonthFiled() }
            }
            .font(.caption.weight(.semibold))
            .buttonStyle(.bordered)
            .controlSize(.mini)
        }
        .padding(12)
        .background(Color.talliBlue.opacity(0.1), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.talliBlue.opacity(0.3), lineWidth: 1))
    }
}

@MainActor
struct ReportFiledBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Report filed this month")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.green)
            Spacer()
        }
        .padding(12)
        .background(Color.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Color.green.opacity(0.3), lineWidth: 1))
    }
}

#Preview {
    ContentView()
        .environment(AppState())
}
