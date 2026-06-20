import WidgetKit
import SwiftUI

@main
struct TalliMacWidgets: WidgetBundle {
    var body: some Widget {
        MacPaymentWidget()
        MacBenefitsWidget()
        MacMessagesWidget()
    }
}
