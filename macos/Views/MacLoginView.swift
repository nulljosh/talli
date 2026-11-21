import SwiftUI

@MainActor
struct MacLoginView: View {
    @EnvironmentObject private var appState: MacAppState
    @State private var username = ""
    @State private var password = ""
    @State private var showFederal = false
    @State private var showProvince = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "chart.bar.doc.horizontal")
                .font(.system(size: 56))
                .foregroundStyle(Color.bcPrimary)

            Text("Talli")
                .font(.system(size: 36, weight: .bold))

            Text("Sign in to see what you're owed")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                TextField("Username", text: $username)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 280)

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 280)
                    .onSubmit {
                        guard !username.isEmpty && !password.isEmpty else { return }
                        Task { await appState.login(username: username, password: password) }
                    }
            }

            Button {
                Task { await appState.login(username: username, password: password) }
            } label: {
                HStack(spacing: 8) {
                    if appState.isLoading {
                        ProgressView()
                            .controlSize(.small)
                    }
                    Text("Sign In")
                        .fontWeight(.semibold)
                }
                .frame(width: 200)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.bcPrimary)
            .disabled(username.isEmpty || password.isEmpty || appState.isLoading)

            if let error = appState.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 300)
            }

            Button("Federal benefits, no account needed") { showFederal = true }
                .buttonStyle(.link)
                .font(.footnote)
            Button("Alberta or Ontario? See your rules") { showProvince = true }
                .buttonStyle(.link)
                .font(.footnote)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(isPresented: $showFederal) {
            NavigationStack {
                ScrollView { BenefitFinderView { try await MacAPIClient.shared.federalFinder(answers: $0) }.frame(maxWidth: 680).padding(24) }
                    .navigationTitle("Federal benefits")
                    .toolbar { Button("Done") { showFederal = false } }
            }
            .frame(minWidth: 520, minHeight: 600)
        }
        .sheet(isPresented: $showProvince) {
            NavigationStack {
                ScrollView { ProvinceView { try await MacAPIClient.shared.provinces() }.frame(maxWidth: 680).padding(24) }
                    .navigationTitle("Outside BC")
                    .toolbar { Button("Done") { showProvince = false } }
            }
            .frame(minWidth: 520, minHeight: 600)
        }
    }
}
