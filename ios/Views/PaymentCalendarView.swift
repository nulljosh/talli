import SwiftUI

struct PaymentCalendarView: View {
    let paymentDate: Date?

    private let calendar = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)
    private let weekdaySymbols = Calendar.current.veryShortWeekdaySymbols

    private var displayMonth: Date {
        paymentDate ?? Date()
    }

    private var monthTitle: String {
        displayMonth.formatted(.dateTime.month(.wide).year())
    }

    private var daysInMonth: [DayCell] {
        let range = calendar.range(of: .day, in: .month, for: displayMonth) ?? 1..<31
        let firstOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: displayMonth))!
        let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
        let offset = firstWeekday - calendar.firstWeekday
        let paddingCount = (offset + 7) % 7

        var cells: [DayCell] = (0..<paddingCount).map { _ in DayCell(day: nil, isPaymentDay: false, isToday: false) }

        let today = calendar.startOfDay(for: Date())
        let paymentDay = paymentDate.map { calendar.component(.day, from: $0) }

        for day in range {
            let date = calendar.date(from: {
                var c = calendar.dateComponents([.year, .month], from: displayMonth)
                c.day = day
                return c
            }())!
            cells.append(DayCell(
                day: day,
                isPaymentDay: day == paymentDay,
                isToday: calendar.startOfDay(for: date) == today
            ))
        }

        return cells
    }

    var body: some View {
        VStack(spacing: 10) {
            Text(monthTitle)
                .font(.subheadline.weight(.semibold))

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(Array(weekdaySymbols.enumerated()), id: \.offset) { _, symbol in
                    Text(symbol)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                ForEach(Array(daysInMonth.enumerated()), id: \.offset) { _, cell in
                    if let day = cell.day {
                        Text("\(day)")
                            .font(.caption)
                            .fontWeight(cell.isPaymentDay ? .bold : .regular)
                            .frame(width: 30, height: 30)
                            .background {
                                if cell.isPaymentDay {
                                    Circle().fill(Color.appleBlue)
                                } else if cell.isToday {
                                    Circle().strokeBorder(Color.appleBlue.opacity(0.4), lineWidth: 1)
                                }
                            }
                            .foregroundStyle(cell.isPaymentDay ? .white : .primary)
                    } else {
                        Text("")
                            .frame(width: 30, height: 30)
                    }
                }
            }
        }
    }
}

private struct DayCell {
    let day: Int?
    let isPaymentDay: Bool
    let isToday: Bool
}

#Preview {
    PaymentCalendarView(paymentDate: Date())
        .padding()
}
