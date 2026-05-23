import SwiftUI

struct MacLoginView: View {
    @Environment(MacAppState.self) private var appState
    @State private var username = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "chart.bar.doc.horizontal")
                .font(.system(size: 56))
                .foregroundStyle(Color.bcPrimary)

            Text("Tally")
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
                HStack(spacing: 6) {
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

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
