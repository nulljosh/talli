// What-if: "if I take this job at 20 hours a week". Month by month, what you earn,
// how much of the yearly earnings exemption is used, what assistance drops by,
// and what you actually end up with. BC's rule: earn up to the annual exemption and
// nothing changes; past it, assistance is reduced by the amount over. Gross pay,
// before tax. Federal benefits (CDB, GST credit) also move with income and are not
// modelled here. Exemption figures live in profiles.js.
const { EARNINGS_EXEMPTION } = require('./profiles');

const pad = (n) => String(n).padStart(2, '0');
const r2 = (n) => Math.round(n * 100) / 100;

// Latest published exemption for this household at or before `year`; flagged when assumed.
function exemptionFor(year, type) {
  const exact = EARNINGS_EXEMPTION[year]?.[type];
  if (exact != null) return { amount: exact, assumed: false };
  const known = Object.keys(EARNINGS_EXEMPTION).map(Number).filter((y) => EARNINGS_EXEMPTION[y]?.[type] != null).sort((a, b) => b - a);
  return known.length ? { amount: EARNINGS_EXEMPTION[known[0]][type], assumed: true } : { amount: null, assumed: true };
}

function cleanInputs(raw, now) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const wage = Number(r.wage), hours = Number(r.hours);
  const m = /^(\d{4})-(\d{2})$/.exec(r.start || '');
  const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const start = m && +m[2] >= 1 && +m[2] <= 12 ? { y: +m[1], m: +m[2] - 1 } : { y: fallback.getFullYear(), m: fallback.getMonth() };
  if (!(wage > 0 && wage <= 500) || !(hours > 0 && hours <= 80)) return null;
  return { wage: r2(wage), hours: r2(hours), start };
}

// base: monthly assistance with no job. earnedSoFar: logged earnings this calendar year.
function deriveWhatIf(raw, { base, household = 'single', earnedSoFar = 0, now = new Date(), months = 12 } = {}) {
  const input = cleanInputs(raw, now);
  if (!input || !(base > 0)) return null;
  const grossRaw = input.wage * input.hours * 52 / 12;   // kept unrounded so cents never drift
  const gross = r2(grossRaw);
  const earned = { [now.getFullYear()]: Number(earnedSoFar) || 0 };
  const rows = [];
  let assumed = false, noExemption = false;
  for (let i = 0; i < months; i++) {
    const d = new Date(input.start.y, input.start.m + i, 1);
    const y = d.getFullYear();
    const ex = exemptionFor(y, household);
    if (ex.amount == null) noExemption = true;
    if (ex.assumed && ex.amount != null) assumed = true;
    const before = earned[y] || 0;
    const after = before + grossRaw;
    earned[y] = after;
    const over = (n) => ex.amount == null ? 0 : Math.max(0, n - ex.amount);
    const reduction = r2(Math.min(base, over(after) - over(before)));
    rows.push({ month: `${y}-${pad(d.getMonth() + 1)}`, earnings: gross, reduction, assistance: r2(base - reduction), total: r2(gross + base - reduction), exemptionUsed: ex.amount == null ? null : Math.min(1, after / ex.amount) });
  }
  if (noExemption) return { input, gross, unknown: true };
  const totalEarnings = r2(grossRaw * months);
  const totalReduction = r2(rows.reduce((a, r) => a + r.reduction, 0));
  const first = rows.find((r) => r.reduction > 0);
  const noWork = r2(base * months);
  const withWork = r2(rows.reduce((a, r) => a + r.total, 0));
  // Room and safe hours are for the calendar year the job starts in, from its start month.
  const ex = exemptionFor(input.start.y, household);
  const used = input.start.y === now.getFullYear() ? Number(earnedSoFar) || 0 : 0;
  const room = ex.amount == null ? null : Math.max(0, r2(ex.amount - used));
  const monthsInYear = 12 - input.start.m;
  const safeHours = room == null ? null : r2(room / (input.wage * monthsInYear * 52 / 12));
  return {
    input, gross, base, rows, months,
    totalEarnings, totalReduction,
    keep: r2(totalEarnings - totalReduction),
    keepPct: totalEarnings ? Math.round((totalEarnings - totalReduction) / totalEarnings * 100) : 100,
    firstClawback: first ? first.month : null,
    assistanceEnds: rows.find((r) => r.assistance === 0)?.month || null,
    noWork, withWork, better: r2(withWork - noWork),
    assumed,
    room, safeHours: safeHours != null && safeHours <= 60 ? safeHours : null,
    note: 'Gross pay, before tax. Free dental, drug and other health coverage on PWD does not depend on this. The Canada Disability Benefit and GST credit also change with income and are not counted.',
  };
}

module.exports = { deriveWhatIf, exemptionFor };
