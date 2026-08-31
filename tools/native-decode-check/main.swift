// Both native clients have shipped bugs where the payload DECODED cleanly and
// still produced nothing on screen:
//   - Workers truncated every authenticated response by a byte (JSON.parse threw)
//   - macOS modelled messages as {subject, body, date} while the server sends
//     {id, text, timestamp}, so every message decoded to "" and got filtered out
// Decoding is therefore not the assertion -- the extracted VALUES are.
import Foundation

let fixture = URL(fileURLWithPath: CommandLine.arguments[1])
let data = try Data(contentsOf: fixture)
var failed = 0

func expect(_ cond: Bool, _ what: String) {
    print(cond ? "  ok    \(what)" : "  FAIL  \(what)")
    if !cond { failed += 1 }
}

let ios = try JSONDecoder().decode(DashboardData.self, from: data)
print("iOS DashboardData")
expect(ios.paymentAmount == "$1,650", "paymentAmount is the derived PWD+CDB total, not the portal's PWD-only line")
expect(ios.income?.totalMonthly == 1650, "income.totalMonthly decoded")
expect(ios.statusMessages.count == 2, "both messages survived decoding (got \(ios.statusMessages.count))")
expect(ios.statusMessages.first?.text == "Extension Granted", "message text is populated, not empty")

let mac = try JSONDecoder().decode(MacDashboardData.self, from: data)
print("macOS MacDashboardData")
expect(mac.paymentAmount == "$1,650", "paymentAmount is the derived PWD+CDB total")
expect(mac.income?.totalMonthly == 1650, "income.totalMonthly decoded")
expect(mac.statusMessages.count == 2, "both messages survived decoding (got \(mac.statusMessages.count))")
expect(mac.statusMessages.first?.text == "Extension Granted", "message text is populated, not empty")

print(failed == 0 ? "\nnative-decode-check: ok" : "\nnative-decode-check: \(failed) failure(s)")
exit(failed == 0 ? 0 : 1)
