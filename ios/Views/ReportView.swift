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
                if isFilingWindowOpen {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundStyle(Color.talliOrange)
                        Text("Filing window is open — closes the 5th")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Color.talliOrange)
                    }
                }
                Text("The filing window is open days 1–5 of each month. Submit during this window.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Submission") {
                VStack(alignment: .leading, spacing: 16) {
                    if !isFormValid {
                        Text("Add your SIN, phone number, and PIN in Settings before filing.")
                            .font(.footnote)
                            .foregroundStyle(Color.talliOrange)
                    }

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
        .padding(.bottom, 90)
        .navigationTitle("Reports")
        .onAppear(perform: loadSavedSecrets)
        .task {
            loadSavedSecrets()
            loadLastSubmittedDate()
        }
    }

    private var isFormValid: Bool {
        PersonalInfo.isComplete(sin: sin, phone: phone, pin: pin)
    }

    private var lastSubmittedLabel: String {
        if let lastSubmittedDate {
            return "Last submitted: \(lastSubmittedDate.formatted(date: .abbreviated, time: .shortened))"
        }
        return "Last submitted: Never"
    }

    private var isFilingWindowOpen: Bool {
        Calendar.current.component(.day, from: Date()) <= 5
    }

    private var nextDeadline: Date {
        let calendar = Calendar.current
        let now = Date()
        var comps = calendar.dateComponents([.year, .month], from: now)
        comps.day = 5
        let deadline5 = calendar.date(from: comps) ?? now
        if now <= deadline5 { return deadline5 }
        return calendar.date(byAdding: .month, value: 1, to: deadline5) ?? now
    }

    private func loadSavedSecrets() {
        sin = KeychainHelper.loadReportSIN() ?? ""
        phone = KeychainHelper.loadReportPhone() ?? ""
        pin = KeychainHelper.loadReportPIN() ?? ""
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
            phone: PersonalInfo.digitsOnly(phone, maxCount: 20),
            pin: pin,
            dryRun: dryRun
        )

        do {
            let response = try await APIClient.shared.submitReport(request)
            KeychainHelper.saveReportSIN(sin)
            KeychainHelper.saveReportPIN(pin)
            KeychainHelper.saveReportPhone(phone)

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
        guard let value else { return nil }
        return DateParsing.parse(value)
    }

}

#Preview {
    NavigationStack {
        ReportView()
    }
}
