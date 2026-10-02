// Supplements on the calendar. Monthly supplements are paid with the regular
// cheque, so their dates are the published cheque dates. The bus pass renews
// once a year, in a month the person picks. Rates are from the BC rate tables
// (checked 2026-10-02); change an amount here only.
const { CHEQUE_ISSUE_DATES } = require('../pay-dates');

// amount null = depends on the person's condition, they enter it.
const CATALOG = [
  { id: 'transport', name: 'Transportation supplement', kind: 'cheque', amount: 52, max: 52, note: '$52 a month with your cheque, instead of the bus pass.' },
  { id: 'buspass', name: 'BC Bus Pass renewal', kind: 'annual', amount: 45, max: 45, note: '$45 a year. Renew it before it runs out.' },
  { id: 'diet', name: 'Diet supplement', kind: 'cheque', amount: null, max: 80, note: '$15 to $80 a month depending on the condition.' },
  { id: 'nutrition', name: 'Monthly nutritional supplement', kind: 'cheque', amount: null, max: 225, note: 'Up to $180 for food and $45 for vitamins.' },
  { id: 'dog', name: 'Guide and service dog supplement', kind: 'cheque', amount: 95, max: 95, note: '$95 a month with your cheque.' },
  { id: 'natal', name: 'Natal supplement', kind: 'cheque', amount: 80, max: 160, note: '$80 a month, $160 for twins or more.' },
];

const BY_ID = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
const CHEQUE_WINDOW_DAYS = 190; // about six cheques ahead
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (isoDate, n) => { const d = new Date(`${isoDate}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };

// Keeps only known supplements and sane values, so a bad POST can't poison the blob.
function cleanSupplements(raw) {
  const items = {};
  for (const [id, v] of Object.entries(raw?.items && typeof raw.items === 'object' ? raw.items : {})) {
    const c = BY_ID[id];
    if (!c || !v || typeof v !== 'object') continue;
    const amount = Number(v.amount);
    const month = Math.trunc(Number(v.month));
    items[id] = {
      on: v.on === true,
      remind: v.remind !== false,
      ...(amount > 0 && amount <= c.max && { amount: Math.round(amount * 100) / 100 }),
      ...(month >= 1 && month <= 12 && { month }),
    };
  }
  return { items };
}

function deriveSupplements(raw, now = new Date()) {
  const { items: saved } = cleanSupplements(raw);
  const today = iso(now);
  const limit = addDays(today, CHEQUE_WINDOW_DAYS);
  const items = CATALOG.map((c) => {
    const s = saved[c.id] || {};
    const amount = s.amount ?? c.amount;
    const on = !!s.on;
    return { id: c.id, name: c.name, kind: c.kind, note: c.note, max: c.max, on, remind: s.remind !== false, amount, month: s.month ?? null,
      needs: on && amount == null ? 'amount' : on && c.kind === 'annual' && !s.month ? 'month' : null };
  });

  const upcoming = [];
  for (const it of items) {
    if (!it.on || it.needs) continue;
    if (it.kind === 'cheque') {
      for (const date of CHEQUE_ISSUE_DATES.filter((d) => d >= today && d <= limit)) {
        upcoming.push({ id: it.id, name: it.name, date, amount: it.amount, kind: it.kind, remindOn: addDays(date, -1), remind: it.remind });
      }
    } else {
      let y = now.getFullYear();
      if (`${y}-${pad(it.month)}-01` < today) y += 1;
      const date = `${y}-${pad(it.month)}-01`;
      upcoming.push({ id: it.id, name: it.name, date, amount: it.amount, kind: it.kind, remindOn: addDays(date, -7), remind: it.remind });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const monthly = Math.round(items.filter((i) => i.on && i.kind === 'cheque' && !i.needs).reduce((a, i) => a + i.amount, 0) * 100) / 100;
  return { items, upcoming, monthly };
}

module.exports = { deriveSupplements, cleanSupplements, CATALOG };
