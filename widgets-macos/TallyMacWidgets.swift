import WidgetKit
import SwiftUI

@main
struct TallyMacWidgets: WidgetBundle {
    var body: some Widget {
        MacPaymentWidget()
        MacBenefitsWidget()
        MacMessagesWidget()
    }
}
