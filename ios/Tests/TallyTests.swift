import XCTest
@testable import Talli

// MARK: - DateParsing

final class DateParsingTests: XCTestCase {
    func testISO8601() {
        XCTAssertNotNil(DateParsing.parse("2026-05-15T10:30:00Z"))
    }

    func testISO8601WithMillis() {
        XCTAssertNotNil(DateParsing.parse("2026-05-15T10:30:00.000Z"))
    }

    func testDateTimeSpaceSeparated() {
        XCTAssertNotNil(DateParsing.parse("2026-05-15 10:30:00"))
    }

    func testDateOnly() {
        XCTAssertNotNil(DateParsing.parse("2026-05-15"))
    }

    func testMonthDayYear() {
        XCTAssertNotNil(DateParsing.parse("May 15, 2026"))
    }

    func testEmptyString() {
        XCTAssertNil(DateParsing.parse(""))
    }

    func testGarbage() {
        XCTAssertNil(DateParsing.parse("not-a-date"))
    }

    func testFutureDate() throws {
        let date = try XCTUnwrap(DateParsing.parse("2099-01-01"))
        XCTAssertGreaterThan(date, Date())
    }

    func testPastDate() throws {
        let date = try XCTUnwrap(DateParsing.parse("2020-01-01"))
        XCTAssertLessThan(date, Date())
    }

    func testRoundtripDateOnly() throws {
        let raw = "2026-06-15"
        let date = try XCTUnwrap(DateParsing.parse(raw))
        let components = Calendar.current.dateComponents([.year, .month, .day], from: date)
        XCTAssertEqual(components.year, 2026)
        XCTAssertEqual(components.month, 6)
        XCTAssertEqual(components.day, 15)
    }
}

// MARK: - DashboardData decoding

final class DashboardDataDecodingTests: XCTestCase {
    private func decode(_ json: String) throws -> DashboardData {
        try JSONDecoder().decode(DashboardData.self, from: Data(json.utf8))
    }

    func testStringMessages() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","next_date":"2026-06-15","messages":["Hello","World"]}
        """)
        XCTAssertEqual(data.statusMessages.count, 2)
        XCTAssertEqual(data.statusMessages[0].text, "Hello")
        XCTAssertEqual(data.statusMessages[1].text, "World")
    }

    func testObjectMessages() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","next_date":"2026-06-15","messages":[
            {"id":"abc","subject":"Notice","body":"Your payment","date":"2026-05-01"}
        ]}
        """)
        XCTAssertEqual(data.statusMessages.count, 1)
        XCTAssertEqual(data.statusMessages[0].id, "abc")
        XCTAssertTrue(data.statusMessages[0].text.contains("Notice"))
        XCTAssertTrue(data.statusMessages[0].text.contains("Your payment"))
        XCTAssertEqual(data.statusMessages[0].timestamp, "2026-05-01")
    }

    func testObjectMessageMissingSubject() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","next_date":"2026-06-15","messages":[
            {"id":"abc","body":"Body only","date":"2026-05-01"}
        ]}
        """)
        XCTAssertEqual(data.statusMessages.count, 1)
        XCTAssertEqual(data.statusMessages[0].text, "Body only")
    }

    func testObjectMessageMissingBody() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","next_date":"2026-06-15","messages":[
            {"id":"abc","subject":"Subject only"}
        ]}
        """)
        XCTAssertEqual(data.statusMessages.count, 1)
        XCTAssertEqual(data.statusMessages[0].text, "Subject only")
    }

    func testObjectMessageBothNilFiltered() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","next_date":"2026-06-15","messages":[
            {"id":"abc"}
        ]}
        """)
        XCTAssertEqual(data.statusMessages.count, 0)
    }

    func testMissingMessagesKey() throws {
        let data = try decode("""
        {"payment_amount":"$500.00","next_date":"2026-06-15"}
        """)
        XCTAssertEqual(data.statusMessages.count, 0)
    }

    func testEmptyMessagesArray() throws {
        let data = try decode("""
        {"payment_amount":"$500.00","next_date":"2026-06-15","messages":[]}
        """)
        XCTAssertEqual(data.statusMessages.count, 0)
    }

    func testNilPaymentAmount() throws {
        let data = try decode("""
        {"next_date":"2026-06-15","messages":[]}
        """)
        XCTAssertNil(data.paymentAmount)
    }

    func testNilNextDate() throws {
        let data = try decode("""
        {"payment_amount":"$1,000.00","messages":[]}
        """)
        XCTAssertNil(data.nextPaymentDate)
    }

    func testObjectMessageIdFallsBackToUUID() throws {
        let data = try decode("""
        {"messages":[{"subject":"No ID"}]}
        """)
        XCTAssertEqual(data.statusMessages.count, 1)
        XCTAssertFalse(data.statusMessages[0].id.isEmpty)
    }
}

// MARK: - AppState computed properties

@MainActor
final class AppStateComputedTests: XCTestCase {
    private var state: AppState!

    override func setUp() async throws {
        state = AppState()
    }

    // paymentAmountText

    func testPaymentAmountTextNoDashboard() {
        XCTAssertEqual(state.paymentAmountText, "--")
    }

    func testPaymentAmountTextNilValue() {
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: nil, statusMessages: [])
        XCTAssertEqual(state.paymentAmountText, "--")
    }

    func testPaymentAmountTextPresent() {
        state.dashboard = DashboardData(paymentAmount: "$1,000.00", nextPaymentDate: nil, statusMessages: [])
        XCTAssertEqual(state.paymentAmountText, "$1,000.00")
    }

    // parsedPaymentAmount

    func testParsedPaymentAmountNil() {
        XCTAssertNil(state.parsedPaymentAmount)
    }

    func testParsedPaymentAmountDollarSign() {
        state.dashboard = DashboardData(paymentAmount: "$1,234.56", nextPaymentDate: nil, statusMessages: [])
        XCTAssertEqual(state.parsedPaymentAmount!, 1234.56, accuracy: 0.001)
    }

    func testParsedPaymentAmountNoSymbol() {
        state.dashboard = DashboardData(paymentAmount: "999.00", nextPaymentDate: nil, statusMessages: [])
        XCTAssertEqual(state.parsedPaymentAmount!, 999.0, accuracy: 0.001)
    }

    func testParsedPaymentAmountGarbage() {
        state.dashboard = DashboardData(paymentAmount: "N/A", nextPaymentDate: nil, statusMessages: [])
        XCTAssertNil(state.parsedPaymentAmount)
    }

    // countdownText

    func testCountdownTextNoDashboard() {
        XCTAssertEqual(state.countdownText, "--")
    }

    func testCountdownTextToday() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayStr = formatter.string(from: Calendar.current.startOfDay(for: Date()))
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: todayStr, statusMessages: [])
        XCTAssertEqual(state.countdownText, "Today")
    }

    func testCountdownTextPast() {
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: "2020-01-01", statusMessages: [])
        XCTAssertEqual(state.countdownText, "Payment date passed")
    }

    func testCountdownTextFuture() {
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: "2099-01-01", statusMessages: [])
        let text = state.countdownText
        XCTAssertTrue(text.hasSuffix("days") || text.hasSuffix("day"), "Expected 'N day(s)', got \(text)")
    }

    func testCountdownTextSingleDay() {
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: Date()))!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: formatter.string(from: tomorrow), statusMessages: [])
        XCTAssertEqual(state.countdownText, "1 day")
    }

    // daysUntilPayment

    func testDaysUntilPaymentNil() {
        XCTAssertNil(state.daysUntilPayment)
    }

    func testDaysUntilPaymentPast() {
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: "2020-01-01", statusMessages: [])
        XCTAssertNil(state.daysUntilPayment)
    }

    func testDaysUntilPaymentToday() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayStr = formatter.string(from: Calendar.current.startOfDay(for: Date()))
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: todayStr, statusMessages: [])
        XCTAssertNil(state.daysUntilPayment) // 0 days returns nil
    }

    func testDaysUntilPaymentFuture() {
        let future = Calendar.current.date(byAdding: .day, value: 7, to: Date())!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: formatter.string(from: future), statusMessages: [])
        XCTAssertEqual(state.daysUntilPayment, 7)
    }

    // unreadMessageCount

    func testUnreadCountNoDashboard() {
        XCTAssertEqual(state.unreadMessageCount, 0)
    }

    func testUnreadCountAllUnread() {
        let msgs = [
            DashboardData.StatusMessage(id: "a", text: "A"),
            DashboardData.StatusMessage(id: "b", text: "B"),
        ]
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: nil, statusMessages: msgs)
        state.readMessageIds = []
        XCTAssertEqual(state.unreadMessageCount, 2)
    }

    func testUnreadCountPartialRead() {
        let msgs = [
            DashboardData.StatusMessage(id: "a", text: "A"),
            DashboardData.StatusMessage(id: "b", text: "B"),
            DashboardData.StatusMessage(id: "c", text: "C"),
        ]
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: nil, statusMessages: msgs)
        state.readMessageIds = ["a", "c"]
        XCTAssertEqual(state.unreadMessageCount, 1)
    }

    func testUnreadCountAllRead() {
        let msgs = [DashboardData.StatusMessage(id: "a", text: "A")]
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: nil, statusMessages: msgs)
        state.readMessageIds = ["a"]
        XCTAssertEqual(state.unreadMessageCount, 0)
    }

    func testUnreadCountStaleReadIds() {
        // readMessageIds has IDs not in current messages — should not inflate count
        let msgs = [DashboardData.StatusMessage(id: "current", text: "New")]
        state.dashboard = DashboardData(paymentAmount: nil, nextPaymentDate: nil, statusMessages: msgs)
        state.readMessageIds = ["stale-id-1", "stale-id-2"]
        XCTAssertEqual(state.unreadMessageCount, 1)
    }

    // isPaid / paidDateText

    func testIsPaidNilStatus() {
        state.paidStatus = nil
        XCTAssertFalse(state.isPaid)
    }

    func testIsPaidTrue() {
        state.paidStatus = PaidStatus(paid: true, month: nil, updatedAt: nil)
        XCTAssertTrue(state.isPaid)
    }

    func testPaidDateTextNilUpdatedAt() {
        state.paidStatus = PaidStatus(paid: true, month: nil, updatedAt: nil)
        XCTAssertNil(state.paidDateText)
    }

    func testPaidDateTextParsed() {
        state.paidStatus = PaidStatus(paid: true, month: "2026-05", updatedAt: "2026-05-15")
        XCTAssertNotNil(state.paidDateText)
    }
}

// MARK: - APIClientError descriptions

final class APIClientErrorTests: XCTestCase {
    func testUnauthorized() {
        XCTAssertEqual(APIClientError.unauthorized.errorDescription, "Session expired. Please sign in again.")
    }

    func testRateLimited() {
        XCTAssertEqual(APIClientError.rateLimited.errorDescription, "Too many sign-in attempts. Wait 15 minutes and try again.")
    }

    func testServerError() {
        XCTAssertEqual(APIClientError.serverError(503).errorDescription, "Server error (503).")
        XCTAssertEqual(APIClientError.serverError(500).errorDescription, "Server error (500).")
    }

    func testInvalidResponse() {
        XCTAssertEqual(APIClientError.invalidResponse.errorDescription, "Invalid response from server.")
    }
}

// MARK: - LoginResponse decoding

final class LoginResponseTests: XCTestCase {
    func testSuccessTrue() throws {
        let json = #"{"success":true}"#
        let r = try JSONDecoder().decode(LoginResponse.self, from: Data(json.utf8))
        XCTAssertTrue(r.success)
        XCTAssertNil(r.error)
    }

    func testSuccessFalseWithError() throws {
        let json = #"{"success":false,"error":"Invalid credentials"}"#
        let r = try JSONDecoder().decode(LoginResponse.self, from: Data(json.utf8))
        XCTAssertFalse(r.success)
        XCTAssertEqual(r.error, "Invalid credentials")
    }
}

// MARK: - ReportSubmissionResponse decoding

final class ReportSubmissionResponseTests: XCTestCase {
    func testPreviewResponse() throws {
        let json = #"{"success":true,"preview":"Preview text here","message":"Done"}"#
        let r = try JSONDecoder().decode(ReportSubmissionResponse.self, from: Data(json.utf8))
        XCTAssertEqual(r.preview, "Preview text here")
        XCTAssertTrue(r.success ?? false)
    }

    func testFailureWithError() throws {
        let json = #"{"success":false,"error":"SIN mismatch"}"#
        let r = try JSONDecoder().decode(ReportSubmissionResponse.self, from: Data(json.utf8))
        XCTAssertFalse(r.success ?? true)
        XCTAssertEqual(r.error, "SIN mismatch")
    }

    func testAllNil() throws {
        let json = #"{}"#
        let r = try JSONDecoder().decode(ReportSubmissionResponse.self, from: Data(json.utf8))
        XCTAssertNil(r.success)
        XCTAssertNil(r.message)
        XCTAssertNil(r.preview)
        XCTAssertNil(r.submittedAt)
        XCTAssertNil(r.error)
    }
}
