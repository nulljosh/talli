// Budget against paydays. Bills have a day of the month; money lands on the
// published cheque dates. For each pay period (one cheque to the day before the
// next) this shows what comes in, what is due, and what is left, so a rent day
// that falls before the next cheque is seen coming.
const { CHEQUE_ISSUE_DATES } = require('../pay-dates');

const MAX_BILLS = 20;
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (s) => new Date(`${s}T12:00:00`);
const r2 = (n) => Math.round(n * 100) / 100;
const dim = (y, m) => new Date(y, m + 1, 0).getDate();     // m is 0 based

function cleanBudget(raw) {
  const list = Array.isArray(raw?.bills) ? raw.bills : [];
  const bills = list.slice(0, MAX_BILLS).map((b, i) => {
    const amount = Number(b?.amount), day = Math.trunc(Number(b?.day));
    const name = String(b?.name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30);
    return { id: String(b?.id || `b${i}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 16) || `b${i}`, name, amount: amount > 0 && amount <= 20000 ? r2(amount) : 0, day: day >= 1 && day <= 31 ? day : 0 };
  }).filter((b) => b.name && b.amount && b.day);
  return { bills };
}

// Every due date of every bill from `fromIso` up to (not including) `toIso`.
function dueDates(bills, fromIso, toIso) {
  const out = [];
  const from = at(fromIso), to = at(toIso);
  for (let y = from.getFullYear(), m = from.getMonth(); new Date(y, m, 1) < to; m++) {
    if (m > 11) { m = 0; y++; }
    for (const b of bills) {
      const date = iso(new Date(y, m, Math.min(b.day, dim(y, m)), 12));
      if (date >= fromIso && date < toIso) out.push({ date, id: b.id, name: b.name, amount: b.amount });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

// perCheque: what lands on each cheque date (PWD, disability benefit and supplements).
function deriveBudget(raw, { perCheque, now = new Date(), periods = 4 } = {}) {
  const { bills } = cleanBudget(raw);
  const today = iso(now);
  const startIdx = Math.max(0, CHEQUE_ISSUE_DATES.filter((d) => d <= today).length - 1);
  const windows = [];
  for (let i = startIdx; i < Math.min(CHEQUE_ISSUE_DATES.length - 1, startIdx + periods); i++) {
    const from = CHEQUE_ISSUE_DATES[i], to = CHEQUE_ISSUE_DATES[i + 1];
    const due = dueDates(bills, from, to);
    const total = r2(due.reduce((a, b) => a + b.amount, 0));
    windows.push({ from, to, current: from <= today && today < to, income: r2(perCheque), bills: due, billsTotal: total, left: r2(perCheque - total) });
  }
  const upcoming = dueDates(bills, today, windows.length ? windows[windows.length - 1].to : today);
  const tight = windows.filter((w) => w.left < 0).map((w) => w.from);
  return { bills, perCheque: r2(perCheque), periods: windows, upcoming, short: tight, monthlyBills: r2(bills.reduce((a, b) => a + b.amount, 0)) };
}

module.exports = { deriveBudget, cleanBudget, dueDates, MAX_BILLS };
