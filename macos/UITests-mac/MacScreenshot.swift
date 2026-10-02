import XCTest

@MainActor
final class MacScreenshot: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureMacScreenshot() throws {
        let app = XCUIApplication()
        // An environment flag, not a launch argument: AppKit reads a bare argument
        // as a file to open, and SwiftUI then skips the main window.
        app.launchEnvironment["UITEST_SNAPSHOT"] = "1"
        app.launch()
        app.activate()
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 20), "App window never appeared")
        sleep(2)
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
