// My household: couples, families, rent and shelter. BC pays a support allowance
// by family unit plus a shelter allowance of your actual rent between a minimum
// and a maximum for the unit size. Figures are the ministry's table effective
// 2025-12-01 (checked 2026-10-02); the annual earnings exemption lives in
// profiles.js. Talli shows the table; the cheque stub is the truth.
const { EARNINGS_EXEMPTION } = require('./profiles');

const TYPES = ['single', 'couple_one', 'couple_both', 'single_parent'];
const TRANSPORT = 52; // per adult with PWD, paid on top

// Support allowance by type and unit size (4 also means 4 or more).
const SUPPORT = {
  single: { 1: 983.5 },
  couple_one: { 2: 1543.5, 3: 1643.5, 4: 1643.5 },
  couple_both: { 2: 1967, 3: 2067, 4: 2067 },
  single_parent: { 2: 1133.5, 3: 1133.5, 4: 1133.5 },
};
const SHELTER = { 1: [75, 500], 2: [150, 695], 3: [200, 790], 4: [225, 840], 5: [250, 890], 6: [275, 940], 7: [300, 990], 8: [325, 1040], 9: [350, 1090], 10: [375, 1140] };
const PWD_ADULTS = { single: 1, couple_one: 1, couple_both: 2, single_parent: 1 };
const MAX_CHILDREN = 10;

const cents = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function shelterLimits(unit) {
  if (SHELTER[unit]) return SHELTER[unit];
  const [lo, hi] = SHELTER[10];                       // past 10: +$25 minimum, +$50 maximum each
  return [lo + 25 * (unit - 10), hi + 50 * (unit - 10)];
}

// Keeps only values the maths understands, so a bad POST can't poison the blob.
function cleanHousehold(raw, now = new Date()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const type = TYPES.includes(r.type) ? r.type : null;
  let children = Math.trunc(Number(r.children));
  children = Number.isFinite(children) ? clamp(children, 0, MAX_CHILDREN) : 0;
  if (type === 'single') children = 0;
  if (type === 'single_parent') children = Math.max(1, children);
  const rent = Number(r.rent);
  const history = (Array.isArray(r.history) ? r.history : [])
    .map((h) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(h?.date) ? h.date : null, rent: clamp(Number(h?.rent) || 0, 0, 10000) }))
    .filter((h) => h.date && h.rent > 0).slice(-24);
  return { type, children, rent: rent > 0 ? cents(clamp(rent, 0, 10000)) : null, history };
}

// `actual` is what the portal says BC is paying (optional). It is only flagged when
// it matches neither the table figure nor the table figure plus the bus supplement.
function deriveHousehold(raw, { actual = null, now = new Date() } = {}) {
  const h = cleanHousehold(raw, now);
  if (!h.type) return null;
  const adults = h.type === 'single' || h.type === 'single_parent' ? 1 : 2;
  const unit = adults + h.children;
  const support = SUPPORT[h.type][Math.min(unit, 4)];
  const [min, max] = shelterLimits(unit);
  const paid = h.rent == null ? null : clamp(h.rent, min, max);
  const transport = TRANSPORT * PWD_ADULTS[h.type];
  const expected = paid == null ? null : cents(support + paid);
  const mismatch = expected != null && Number(actual) > 0
    && Math.abs(actual - expected) >= 1 && Math.abs(actual - (expected + transport)) >= 1
    ? { expected, actual: cents(Number(actual)), diff: cents(actual - expected) } : null;
  const year = now.getFullYear();
  return {
    type: h.type, children: h.children, unit, rent: h.rent, history: h.history,
    support, shelter: { min, max, paid }, transport,
    youCover: h.rent == null ? null : cents(Math.max(0, h.rent - max)),
    monthlyMax: cents(support + max),
    expected,
    earningsExemption: EARNINGS_EXEMPTION[year]?.[h.type] ?? null,
    shared: adults === 2,
    mismatch,
    say: mismatch
      ? `My payment is $${mismatch.actual.toFixed(2)} a month. By the rate table I expected $${mismatch.expected.toFixed(2)} for my household and my rent of $${h.rent}. Can you check my support and shelter amounts and tell me if either is out of date?`
      : null,
  };
}

// When the rent changes, remember when. Called by the POST route.
function withRentHistory(existing, next, now = new Date()) {
  const e = cleanHousehold(existing, now);
  const n = cleanHousehold(next, now);
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const history = n.rent && n.rent !== e.rent ? [...e.history, { date, rent: n.rent }].slice(-24) : e.history;
  return { ...n, history };
}

module.exports = { deriveHousehold, cleanHousehold, withRentHistory, TYPES, SUPPORT, SHELTER };
