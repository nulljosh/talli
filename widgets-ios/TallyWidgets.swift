import WidgetKit
import SwiftUI

@main
struct TallyWidgets: WidgetBundle {
    var body: some Widget {
        PaymentWidget()
        BenefitsWidget()
        MessagesWidget()
    }
}
