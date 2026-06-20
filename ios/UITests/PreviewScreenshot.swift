import XCTest

@MainActor
final class PreviewScreenshot: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureAppStoreScreenshots() throws {
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launchArguments.append("UITEST_SNAPSHOT")
        app.launch()

        sleep(3)
        snapshot("01-Home")

        let tabBar = app.tabBars.firstMatch
        let tabs = ["Reports", "Benefits", "Messages"]
        for (index, name) in tabs.enumerated() {
            let button = tabBar.buttons[name]
            if button.waitForExistence(timeout: 5) {
                button.tap()
                sleep(2)
                snapshot("0\(index + 2)-\(name)")
            }
        }
    }
}
