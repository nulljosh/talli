import XCTest

@MainActor
final class MacScreenshot: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureMacScreenshot() throws {
        let app = XCUIApplication()
        app.launchArguments.append("UITEST_SNAPSHOT")
        app.launch()
        sleep(5)

        let screenshot = XCUIScreen.main.screenshot()
        let dir = NSTemporaryDirectory() + "talli-mac-screenshots"
        do {
            try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/1-main.png"))
        } catch {
            XCTFail("Screenshot write failed: \(error)")
        }
    }
}
