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

        app.activate()
        sleep(1)
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 10), "App window never appeared")
        let window = app.windows.allElementsBoundByIndex.first { $0.frame.width > 200 && $0.frame.height > 200 } ?? app.windows.firstMatch
        let screenshot = window.screenshot()
        let dir = NSTemporaryDirectory() + "talli-mac-screenshots"
        do {
            try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/1-main.png"))
        } catch {
            XCTFail("Screenshot write failed: \(error)")
        }
    }
}
