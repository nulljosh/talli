// Missed-payment alert. A cheque is "missed" when its issue date has passed,
// the person has not marked it received, and it is still recent enough to chase.
// Talli cannot see the bank account, so the alert asks and gives the script.
const { CHEQUE_ISSUE_DATES } = require('../pay-dates');

const MINISTRY_PHONE = '1-866-866-0800';
const ADVOCATE_PHONE = '1-800-663-1278';
const CHASE_DAYS = 14; // after this the next cheque is close and the question is moot
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (isoDate) => new Date(`${isoDate}T12:00:00`);
const addDays = (isoDate, n) => { const d = at(isoDate); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((at(b) - at(a)) / 86400000);
const monthName = (isoDate) => at(isoDate).toLocaleString('en-CA', { month: 'long' });
const dayText = (isoDate) => at(isoDate).toLocaleString('en-CA', { month: 'long', day: 'numeric' });

// paidMonths is {'YYYY-MM': isoTimestamp}; a mark made on or after the issue date
// means the money arrived, whatever month key the client used.
function deriveMissedPayment({ paidMonths = {}, reportMonths = {}, onAssistance = false, now = new Date() } = {}) {
  const today = iso(now);
  const known = onAssistance || Object.keys(paidMonths || {}).length > 0;
  if (!known) return { missed: null, watch: [] };

  const due = CHEQUE_ISSUE_DATES.filter((d) => d <= today).pop();
  const watch = CHEQUE_ISSUE_DATES.filter((d) => d > today).slice(0, 2)
    .map((date) => ({ date, month: date.slice(0, 7), fireOn: addDays(date, 1) }));
  const paid = (due && Object.values(paidMonths || {}).some((ts) => String(ts).slice(0, 10) >= due)) || !!(due && paidMonths?.[due.slice(0, 7)]);
  if (!due || due >= today || daysBetween(due, today) > CHASE_DAYS || paid) return { missed: null, watch };

  const reportFiled = !!reportMonths?.[due.slice(0, 7)];
  const month = monthName(due);
  return {
    watch,
    missed: {
      due, month: due.slice(0, 7), daysLate: daysBetween(due, today),
      cause: reportFiled ? null : `Talli has not seen your ${month} report filed. BC holds the cheque when the monthly report is missed, and that is the most common reason a payment does not show.`,
      steps: [
        'Check your bank account again. Deposits can post late in the day.',
        'Open My Self Serve and look for a message about a hold or a missing document.',
        `Call the ministry on ${MINISTRY_PHONE}. Ask for the status of your payment and whether it was sent to the right account.`,
        'If you cannot wait, ask for a crisis supplement for food and shelter. It does not have to be paid back.',
        `Still stuck? Disability Alliance BC helps for free: ${ADVOCATE_PHONE}.`,
      ],
      say: `My cheque was supposed to be issued on ${dayText(due)} and it has not arrived. Can you tell me the status of my payment, whether there is a hold on my file, and whether it went to the right bank account? If it cannot be fixed today, I need a crisis supplement for food and shelter.`,
      phone: MINISTRY_PHONE,
      link: 'https://myselfserve.gov.bc.ca',
    },
  };
}

module.exports = { deriveMissedPayment, MINISTRY_PHONE };
