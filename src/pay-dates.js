// BC Employment and Assistance cheque issue dates, transcribed from the province's
// published schedule (www2.gov.bc.ca/gov/content/family-social-supports/income-assistance/payment-dates).
// Each date is the day the payment is issued; it covers the FOLLOWING month.
// There is no formula -- the ministry publishes these annually and they are not simply
// "last Wednesday" (2026 uses 3rd, 4th and 5th Wednesdays). Refresh this list each year
// when the province posts the next schedule.
//
// Lives in its own module so src/api.js and the test suite share one copy; an earlier
// duplicate of this table in tools/test-mobile-data.js drifted and let 5 wrong dates pass.
const CHEQUE_ISSUE_DATES = [
  '2026-01-21', '2026-02-25', '2026-03-25', '2026-04-22',
  '2026-05-27', '2026-06-24', '2026-07-29', '2026-08-26',
  '2026-09-23', '2026-10-21', '2026-11-18', '2026-12-16',
];

// Next issue date on or after today, or null once the published schedule runs out.
// Returning null is deliberate: `next_date` is optional for every client (iOS decodes it
// with decodeIfPresent and renders "--"), and showing nothing beats extrapolating a wrong
// date onto a benefits payment.
function nextPaymentDate(today = new Date(), onExhausted) {
  const pad = (n) => String(n).padStart(2, '0');
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const next = CHEQUE_ISSUE_DATES.find((d) => d >= todayKey);
  if (!next && onExhausted) onExhausted();
  return next || null;
}

module.exports = { CHEQUE_ISSUE_DATES, nextPaymentDate };
