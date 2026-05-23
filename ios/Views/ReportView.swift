import SwiftUI

struct ReportView: View {
    private enum Constants {
        static let lastSubmittedKey = "report-last-submitted-at"
    }

    @State private var sin = ""
    @State private var phone = ""
    @State private var pin = ""

    @State private var previewText: String?
    @State private var statusText: String?
    @State private var statusIsError = false
    @State private var lastSubmittedDate: Date?
    @State private var isSubmitting = false
    @State private var showSubmitConfirmation = false

    var body: some View {
        Form {
            Section("Timing") {
                Text("The period opens ~21st. Don't submit until after the 28th -- forms submitted in the first week don't clear by payday.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Personal Information") {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Social Insurance Number")
                            .font(.subheadline.weight(.medium))

                        SecureField("SIN (9 digits)", text: $sin)
                            .keyboardType(.numberPad)
                            .onChange(of: sin) { _, newValue in
                                sin = digitsOnly(from: newValue, maxCount: 9)
                            }

                        if let sinValidationMessage {
                            Text(sinValidationMessage)
                                .font(.footnote)
                                .foregroundStyle(Color.gradeRed)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Phone Number")
                            .font(.subheadline.weight(.medium))

                        TextField("Phone", text: $phone)
                            .keyboardType(.phonePad)
                            .onChange(of: phone) { _, newValue in
                                phone = formatPhone(newValue)
                            }

                        if let phoneValidationMessage {
                            Text(phoneValidationMessage)
                                .font(.footnote)
                                .foregroundStyle(Color.gradeRed)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Personal Identification Number")
                            .font(.subheadline.weight(.medium))

                        SecureField("PIN", text: $pin)
                            .keyboardType(.numberPad)
                            .onChange(of: pin) { _, newValue in
                                pin = digitsOnly(from: newValue, maxCount: 12)
                            }

                        if let pinValidationMessage {
                            Text(pinValidationMessage)
                                .font(.footnote)
                                .foregroundStyle(Color.gradeRed)
                        }
                    }
                }
            }

            Section("Submission") {
                VStack(alignment: .leading, spacing: 16) {
                    Button("Preview Report") {
                        Task { await submit(dryRun: true) }
                    }
                    .foregroundStyle(Color.appleBlue)
                    .disabled(!isFormValid || isSubmitting)

                    Button("Submit Report") {
                        showSubmitConfirmation = true
                    }
                    .foregroundStyle(Color.appleBlue)
                    .disabled(!isFormValid || isSubmitting)
                    .confirmationDialog("Submit monthly report now?", isPresented: $showSubmitConfirmation) {
                        Button("Submit", role: .destructive) {
                            Task { await submit(dryRun: false) }
                        }
                        Button("Cancel", role: .cancel) { }
                    }

                    if isSubmitting {
                        HStack {
                            ProgressView()
                            Text("Submitting...")
                        }
                    }
                }
            }

            if let previewText, !previewText.isEmpty {
                Section("Preview") {
                    Text(previewText)
                }
            }

            Section("Submission Status") {
                if let statusText {
                    Text(statusText)
                        .foregroundStyle(statusIsError ? Color.gradeRed : Color.appleBlue)
                }

                Text(lastSubmittedLabel)
                Text("Next deadline: \(nextDeadline.formatted(date: .complete, time: .omitted))")
            }
        }
        .navigationTitle("Reports")
        .task {
            loadSavedSecrets()
            loadLastSubmittedDate()
        }
    }

    private var isFormValid: Bool {
        sin.count == 9 && !digitsOnly(from: phone, maxCount: 20).isEmpty && !pin.isEmpty
    }

    private var sinValidationMessage: String? {
        if !sin.isEmpty && sin.count != 9 {
            return "SIN must be exactly 9 digits"
        }
        return nil
    }

    private var phoneValidationMessage: String? {
        if !phone.isEmpty && digitsOnly(from: phone, maxCount: 20).count < 10 {
            return "Phone number must be 10 digits"
        }
        return nil
    }

    private var pinValidationMessage: String? {
        if !pin.isEmpty && pin.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "PIN is required"
        }
        return nil
    }

    private var lastSubmittedLabel: String {
        if let lastSubmittedDate {
            return "Last submitted: \(lastSubmittedDate.formatted(date: .abbreviated, time: .shortened))"
        }
        return "Last submitted: Never"
    }

    private var nextDeadline: Date {
        let calendar = Calendar.current
        let now = Date()
        let year = calendar.component(.year, from: now)
        let month = calendar.component(.month, from: now)

        let startOfThisMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? now
        if now <= startOfThisMonth {
            return startOfThisMonth
        }

        let nextMonth = calendar.date(byAdding: .month, value: 1, to: startOfThisMonth) ?? now
        return nextMonth
    }

    private func loadSavedSecrets() {
        if let savedSIN = KeychainHelper.loadReportSIN() {
            sin = savedSIN
        }
        if let savedPIN = KeychainHelper.loadReportPIN() {
            pin = savedPIN
        }
    }

    private func loadLastSubmittedDate() {
        if let timestamp = UserDefaults.standard.object(forKey: Constants.lastSubmittedKey) as? Date {
            lastSubmittedDate = timestamp
        }
    }

    @MainActor
    private func submit(dryRun: Bool) async {
        isSubmitting = true
        defer { isSubmitting = false }

        let request = ReportSubmissionRequest(
            sin: sin,
            phone: digitsOnly(from: phone, maxCount: 20),
            pin: pin,
            dryRun: dryRun
        )

        do {
            let response = try await APIClient.shared.submitReport(request)
            KeychainHelper.saveReportSIN(sin)
            KeychainHelper.saveReportPIN(pin)

            if dryRun {
                previewText = response.preview ?? response.message ?? "Preview generated."
                statusText = "Preview completed successfully."
                statusIsError = false
            } else {
                let successful = response.success ?? true
                if successful {
                    let submittedDate = parseDate(response.submittedAt) ?? Date()
                    lastSubmittedDate = submittedDate
                    UserDefaults.standard.set(submittedDate, forKey: Constants.lastSubmittedKey)
                    statusText = response.message ?? "Report submitted successfully."
                    statusIsError = false
                } else {
                    statusText = response.error ?? response.message ?? "Submission failed."
                    statusIsError = true
                }
            }
        } catch {
            statusText = error.localizedDescription
            statusIsError = true
        }
    }

    private func parseDate(_ value: String?) -> Date? {
        nil
    }

    private func digitsOnly(from value: String, maxCount: Int) -> String {
        String(value.filter(\.isNumber).prefix(maxCount))
    }

    private func formatPhone(_ value: String) -> String {
        let digits = digitsOnly(from: value, maxCount: 10)

        if digits.count <= 3 {
            return digits
        }
        if digits.count <= 6 {
            let area = digits.prefix(3)
            let rest = digits.dropFirst(3)
            return "(\(area)) \(rest)"
        }

        let area = digits.prefix(3)
        let mid = digits.dropFirst(3).prefix(3)
        let last = digits.dropFirst(6)
        return "(\(area)) \(mid)-\(last)"
    }
}

#Preview {
    NavigationStack {
        ReportView()
    }
}
