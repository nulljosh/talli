import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @AppStorage("app_theme") private var rawTheme = "system"
    @State private var isGeneratingAvatar = false

    var body: some View {
        List {
            Section("Appearance") {
                AppearancePicker(rawTheme: $rawTheme)
                    .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
            }

            Section {
                HStack(spacing: 14) {
                    avatarButton
                    VStack(alignment: .leading, spacing: 2) {
                        Text(appState.username ?? "—")
                            .font(.body.weight(.semibold))
                        Text("BC Self-Serve")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section {
                HStack {
                    Text("Account")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(appState.username ?? "—")
                        .foregroundStyle(.primary)
                }
            }

            PersonalInfoSection()

            Section {
                Button(role: .destructive) {
                    Task { await appState.logout() }
                } label: {
                    Text("Log Out")
                }
            }
        }
        .navigationTitle("Settings")
    }

    private var avatarButton: some View {
        VStack(spacing: 6) {
            Button {
                guard !isGeneratingAvatar else { return }
                isGeneratingAvatar = true
                Task { @MainActor in
                    await Task.yield()
                    appState.regenerateAvatar()
                    isGeneratingAvatar = false
                }
            } label: {
                ZStack {
                    AvatarView(size: 56)
                    if isGeneratingAvatar {
                        Circle()
                            .fill(.black.opacity(0.4))
                            .frame(width: 56, height: 56)
                        ProgressView().tint(.white)
                    }
                }
            }
            .buttonStyle(.plain)
            Text("Tap to regenerate")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

/// Report identity fields. Moved here from ReportView so the values are entered once
/// in Settings and reused by every monthly submission.
private struct PersonalInfoSection: View {
    @State private var sin = ""
    @State private var phone = ""
    @State private var pin = ""

    var body: some View {
        Section("Personal Information") {
            field("Social Insurance Number", validation: sinValidationMessage) {
                SecureField("SIN (9 digits)", text: $sin)
                    .keyboardType(.numberPad)
                    .onChange(of: sin) { _, newValue in
                        sin = PersonalInfo.digitsOnly(newValue, maxCount: 9)
                        KeychainHelper.saveReportSIN(sin)
                    }
            }

            field("Phone Number", validation: phoneValidationMessage) {
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                    .onChange(of: phone) { _, newValue in
                        phone = PersonalInfo.formatPhone(newValue)
                        KeychainHelper.saveReportPhone(phone)
                    }
            }

            field("Personal Identification Number", validation: nil) {
                SecureField("PIN", text: $pin)
                    .keyboardType(.numberPad)
                    .onChange(of: pin) { _, newValue in
                        pin = PersonalInfo.digitsOnly(newValue, maxCount: 12)
                        KeychainHelper.saveReportPIN(pin)
                    }
            }

            Text("Used to file your monthly report. Stored only in this device's keychain.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .onAppear {
            sin = KeychainHelper.loadReportSIN() ?? ""
            phone = KeychainHelper.loadReportPhone() ?? ""
            pin = KeychainHelper.loadReportPIN() ?? ""
        }
    }

    private func field<Content: View>(
        _ label: String,
        validation: String?,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline.weight(.medium))
            content()
            if let validation {
                Text(validation)
                    .font(.footnote)
                    .foregroundStyle(Color.gradeRed)
            }
        }
        .padding(.vertical, 2)
    }

    private var sinValidationMessage: String? {
        !sin.isEmpty && sin.count != 9 ? "SIN must be exactly 9 digits" : nil
    }

    private var phoneValidationMessage: String? {
        !phone.isEmpty && PersonalInfo.digitsOnly(phone, maxCount: 20).count < 10
            ? "Phone number must be 10 digits"
            : nil
    }
}

private struct AppearancePicker: View {
    @Binding var rawTheme: String
    private let options = [("light", "Light"), ("dark", "Dark"), ("system", "System")]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(options, id: \.0) { id, label in
                Button { rawTheme = id } label: {
                    VStack(spacing: 8) {
                        themePreview(id)
                            .frame(height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(rawTheme == id ? Color.accentColor : Color.primary.opacity(0.12), lineWidth: 2)
                            )
                        Text(label)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(rawTheme == id ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(.secondary))
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder
    private func themePreview(_ id: String) -> some View {
        switch id {
        case "light":
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color(white: 0.92))
        case "dark":
            RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color(white: 0.12))
        default:
            GeometryReader { geo in
                ZStack {
                    Color(white: 0.92)
                    Path { p in
                        p.move(to: CGPoint(x: geo.size.width, y: 0))
                        p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                        p.addLine(to: CGPoint(x: 0, y: geo.size.height))
                        p.closeSubpath()
                    }.fill(Color(white: 0.12))
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppState())
    }
}
