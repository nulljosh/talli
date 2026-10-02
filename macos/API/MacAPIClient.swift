import Foundation

enum MacAPIError: Error, LocalizedError {
    case unauthorized
    case serverError(Int)
    case invalidResponse
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Session expired. Please sign in again."
        case .serverError(let code): return "Server error (\(code))."
        case .invalidResponse: return "Invalid response from server."
        case .decodingError(let error): return "Parse error: \(error.localizedDescription)"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        }
    }
}

final class MacAPIClient: @unchecked Sendable {
    static let shared = MacAPIClient()

    // swiftlint:disable:next force_unwrapping
    private let baseURL = URL(string: "https://talli.heyitsmejosh.com")!
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        let config = URLSessionConfiguration.default
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        config.httpCookieStorage = .shared
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        session = URLSession(configuration: config)
    }

    func login(username: String, password: String) async throws -> MacLoginResponse {
        var request = URLRequest(url: baseURL.appending(path: "api/login"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(MacLoginRequest(username: username, password: password))

        let data: Data
        do {
            (data, _) = try await session.data(for: request)
        } catch {
            throw MacAPIError.networkError(error)
        }

        // A fresh login attempt's 401 means BC Self-Serve rejected the credentials,
        // not that an existing session expired -- decode it like a normal response
        // so the real failure reason reaches the UI instead of a generic message.
        do {
            return try decoder.decode(MacLoginResponse.self, from: data)
        } catch {
            throw MacAPIError.decodingError(error)
        }
    }

    func sessionCheck() async throws -> Bool {
        var request = URLRequest(url: baseURL.appending(path: "api/session-check"))
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { return false }
        return http.statusCode == 200
    }

    func logout() async throws {
        var request = URLRequest(url: baseURL.appending(path: "api/logout"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { return }
    }

    func latest() async throws -> MacDashboardData {
        try await send(path: "api/mobile", responseType: MacDashboardData.self)
    }

    /// Triggers a fresh scrape, then fetches parsed mobile data.
    ///
    /// A failed/slow live scrape must not fail the whole refresh -- api/mobile
    /// still returns usable (cached or computed) data on its own, so throwing
    /// here reported a healthy dashboard as fully offline. The caller gets the
    /// scrape outcome instead and surfaces it quietly. Mirrors iOS APIClient.
    func check() async throws -> (data: MacDashboardData, scrapeSucceeded: Bool) {
        var scrapeSucceeded = true
        do {
            _ = try await send(path: "api/check", responseType: MacCheckResponse.self)
        } catch {
            scrapeSucceeded = false
        }
        let data = try await send(path: "api/mobile", responseType: MacDashboardData.self)
        return (data, scrapeSucceeded)
    }

    func getReportStatus() async throws -> (months: [String: String], pwdApproved: Bool) {
        struct R: Decodable { let reportMonths: [String: String]?; let pwdApproved: Bool? }
        let r = try await send(path: "api/report-status", responseType: R.self)
        return (r.reportMonths ?? [:], r.pwdApproved ?? false)
    }

    func setReportStatus(month: String, filed: Bool) async throws {
        struct Body: Encodable { let month: String; let filed: Bool }
        struct Resp: Decodable { let reportMonths: [String: String]? }
        _ = try await send(path: "api/report-status", method: "POST", body: Body(month: month, filed: filed), responseType: Resp.self)
    }

    func benefitFinder(answers: [String: [String]]?) async throws -> BenefitFinder {
        if let answers {
            return try await send(path: "api/benefit-finder", method: "POST", body: BenefitFinderRequest(answers: answers), responseType: BenefitFinder.self)
        }
        return try await send(path: "api/benefit-finder", responseType: BenefitFinder.self)
    }

    /// Raw requests for the document vault: ciphertext in and out, so no JSON decoding.
    var vault: VaultAPI {
        VaultAPI { path, method, body, contentType in
            try await MacAPIClient.shared.rawRequest(path: path, method: method, body: body, contentType: contentType)
        }
    }

    fileprivate func rawRequest(path: String, method: String, body: Data?, contentType: String) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        if let body {
            request.httpBody = body
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        return data
    }

    var trustedHelpers: TrustedHelperAPI {
        struct Ack: Decodable { let ok: Bool }
        return TrustedHelperAPI(
            list: { try await MacAPIClient.shared.send(path: "api/helpers", responseType: TrustedHelpers.self) },
            create: { name in try await MacAPIClient.shared.send(path: "api/helpers", method: "POST", body: HelperRequest(name: name), responseType: NewHelper.self) },
            remove: { id in _ = try await MacAPIClient.shared.send(path: "api/helpers/\(id)", method: "DELETE", responseType: Ack.self) }
        )
    }

    func household(save: HouseholdRequest?) async throws -> Household {
        if let save {
            return try await send(path: "api/household", method: "POST", body: save, responseType: Household.self)
        }
        return try await send(path: "api/household", responseType: Household.self)
    }

    func serviceRequests() async throws -> ServiceRequests {
        try await send(path: "api/requests", responseType: ServiceRequests.self)
    }

    func messageReply(text: String) async throws -> MessageReply {
        try await send(path: "api/message-reply", method: "POST", body: MessageReplyRequest(text: text), responseType: MessageReply.self)
    }

    func reconsideration(received: String?) async throws -> Reconsideration {
        if let received {
            return try await send(path: "api/reconsideration", method: "POST", body: ReconsiderationRequest(received: received), responseType: Reconsideration.self)
        }
        return try await send(path: "api/reconsideration", responseType: Reconsideration.self)
    }

    func missedPayment() async throws -> MissedPayment {
        try await send(path: "api/missed-payment", responseType: MissedPayment.self)
    }

    /// Marks the cheque for one month key (YYYY-MM) as received.
    func markPaid(month: String) async throws {
        struct Body: Encodable { let paid: Bool; let month: String }
        struct Ack: Decodable { let paidMonths: [String: String] }
        _ = try await send(path: "api/paid-status", method: "POST", body: Body(paid: true, month: month), responseType: Ack.self)
    }

    func supplements(save: SupplementsRequest?) async throws -> Supplements {
        if let save {
            return try await send(path: "api/supplements", method: "POST", body: save, responseType: Supplements.self)
        }
        return try await send(path: "api/supplements", responseType: Supplements.self)
    }

    func rdspTracker(patch: RdspTrackerRequest?) async throws -> RdspTracker {
        if let patch {
            return try await send(path: "api/rdsp-tracker", method: "POST", body: patch, responseType: RdspTracker.self)
        }
        return try await send(path: "api/rdsp-tracker", responseType: RdspTracker.self)
    }

    func widgetToken() async throws -> String {
        struct TokenResponse: Decodable { let token: String }
        let response = try await send(path: "api/widget-token", responseType: TokenResponse.self)
        return response.token
    }

    fileprivate func send<Response: Decodable>(
        path: String,
        method: String = "GET",
        responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await execute(request, responseType: responseType)
    }

    fileprivate func send<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body,
        responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        return try await execute(request, responseType: responseType)
    }

    private func execute<Response: Decodable>(
        _ request: URLRequest,
        responseType: Response.Type
    ) async throws -> Response {
        let data: Data
        let urlResponse: URLResponse

        do {
            (data, urlResponse) = try await session.data(for: request)
        } catch {
            throw MacAPIError.networkError(error)
        }

        guard let http = urlResponse as? HTTPURLResponse else {
            throw MacAPIError.invalidResponse
        }

        switch http.statusCode {
        case 200...299: break
        case 401: throw MacAPIError.unauthorized
        default: throw MacAPIError.serverError(http.statusCode)
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw MacAPIError.decodingError(error)
        }
    }
}

private struct MacLoginRequest: Encodable {
    let username: String
    let password: String
}

private struct MacCheckResponse: Decodable {
    let success: Bool?
}
