import SwiftUI

private let whatsNewVersion = "3.5.6"
private let whatsNewBullets = [
    "Login and splash screens now match your light/dark theme",
    "Home page decluttered — status noise removed",
    "CRA benefit dates update themselves each quarter",
]

struct WhatsNewSheet: View {
    @AppStorage("whats_new_seen_version") private var seenVersion = ""
    @State private var isPresented = false
    @State private var contentHeight: CGFloat = 220

    var body: some View {
        Color.clear
            .onAppear { isPresented = seenVersion != whatsNewVersion }
            .sheet(isPresented: $isPresented) {
                VStack(alignment: .leading, spacing: 20) {
                    Text("What's New in v\(whatsNewVersion)")
                        .font(.title2.bold())

                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(whatsNewBullets, id: \.self) { bullet in
                            HStack(alignment: .top, spacing: 8) {
                                Text("•")
                                Text(bullet)
                            }
                        }
                    }
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                    Button {
                        seenVersion = whatsNewVersion
                        isPresented = false
                    } label: {
                        Text("Got it")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.talliOrange)
                }
                .padding(24)
                .background(GeometryReader { geo in
                    Color.clear.preference(key: SheetHeightKey.self, value: geo.size.height)
                })
                .onPreferenceChange(SheetHeightKey.self) { contentHeight = $0 }
                .presentationDetents([.height(contentHeight)])
            }
    }
}

private struct SheetHeightKey: PreferenceKey {
    nonisolated(unsafe) static var defaultValue: CGFloat = 220
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}
