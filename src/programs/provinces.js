// Provinces as data. Adding one is a JSON file in data/provinces plus one line below:
// no new code. Each file says what the program pays and how earnings are treated, and
// the what-if calculator reads the rule from here. BC's yearly exemption table stays in
// profiles.js (it is a different, annual rule); AB and ON use monthly tiers.
const bc = require('../../data/provinces/bc.json');
const ab = require('../../data/provinces/ab.json');
const on = require('../../data/provinces/on.json');

const PROVINCES = { bc, ab, on };
const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
const r2 = (n) => Math.round(n * 100) / 100;

const getProvince = (code) => PROVINCES[String(code || '').toLowerCase()] || null;

// Dollars taken off the cheque for one month's earnings under a tier list:
// each slice of earnings loses (1 - keep) of its value.
function monthlyDeduction(tiers, earnings) {
  let lo = 0, out = 0;
  for (const t of tiers) {
    const hi = t.upTo == null ? Infinity : t.upTo;
    out += Math.max(0, Math.min(earnings, hi) - lo) * (1 - t.keep);
    lo = hi;
    if (earnings <= hi) break;
  }
  return r2(out);
}

const tiersFor = (p, family) => (family && p.earnings.familyTiers) || p.earnings.tiers;

// Plain words for the rule, built from the data so it can never disagree with the maths.
function describeRule(p, family = false) {
  if (p.earnings.kind === 'annual') return 'You can earn up to a yearly limit with no change. Above it, assistance drops by the amount over.';
  const parts = [];
  let lo = 0;
  for (const t of tiersFor(p, family)) {
    const hi = t.upTo;
    if (t.keep === 1) parts.push(`You keep every dollar of the first ${money(hi)} a month.`);
    else if (t.keep === 0) parts.push(`Above ${money(lo)} a month you lose a dollar of assistance for each dollar earned.`);
    else parts.push(`${hi == null ? `Above ${money(lo)}` : `From ${money(lo)} to ${money(hi)}`} a month you keep ${Math.round(t.keep * 100)} cents of each dollar.`);
    lo = hi;
  }
  return parts.join(' ');
}

function listProvinces() {
  return Object.values(PROVINCES).map((p) => ({
    code: p.code, name: p.name, program: p.program, asOf: p.asOf, monthlySingle: p.monthlySingle,
    monthlyNote: p.monthlyNote, children: p.children || null, extra: p.extra || null, paid: p.paid,
    rule: describeRule(p), familyRule: p.earnings.familyTiers ? describeRule(p, true) : null,
    apply: p.apply, payments: p.payments || null, confidence: p.confidence,
  }));
}

module.exports = { PROVINCES, getProvince, listProvinces, monthlyDeduction, describeRule, tiersFor };
