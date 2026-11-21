import SwiftUI

@MainActor
struct StatusView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        BenefitsView()
            .toolbar {
                if !appState.pwdApproved {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink("Report") { ReportView() }
                    }
                }
            }
    }
}
