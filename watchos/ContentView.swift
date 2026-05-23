import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            PaymentGlance()
            BenefitsView()
            MessagesView()
        }
        .tabViewStyle(.verticalPage)
    }
}
