// RDSP grant and bond tracker. Pure maths: what the government has paid in,
// what is still on the table this year, what carries forward.
//
// Rates are the 2026 figures from canada.ca (checked 2026-10-02). Family income
// bands: low = under $38,237 (full $1,000 bond), mid = up to $117,045 (full
// grant match, bond phases out to $58,523 so it is counted as 0 here), high =
// above that (grant is 100% on the first $1,000). Change a number here only.

const GRANT_LIFETIME = 70000;
const BOND_LIFETIME = 20000;
const CONTRIBUTION_LIFETIME = 200000;
const GRANT_YEARLY_MAX = 10500; // with carry forward
const BOND_YEARLY_MAX = 11000;
const CARRY_YEARS = 10;
const LAST_AGE = 49; // grants and bonds stop the year you turn 49
const FIRST_YEAR = 2008;

// Per year: what you can earn, and what you must put in to earn the grant.
const ENTITLEMENT = {
  low: { grant: 3500, put: 1500, bond: 1000 },
  mid: { grant: 3500, put: 1500, bond: 0 },
  high: { grant: 1000, put: 1000, bond: 0 },
};

const BANDS = Object.keys(ENTITLEMENT);
const money = (n) => Math.max(0, Math.min(1e7, Math.round((Number(n) || 0) * 100) / 100));
const year = (n, lo, hi) => { const y = Math.trunc(Number(n)); return y >= lo && y <= hi ? y : null; };

// Keeps only what the maths understands, so a bad POST can't poison the blob.
function cleanRdsp(raw, now = new Date()) {
  const thisYear = now.getFullYear();
  const r = raw && typeof raw === 'object' ? raw : {};
  const entries = (Array.isArray(r.entries) ? r.entries : [])
    .map((e) => ({ year: year(e?.year, FIRST_YEAR, thisYear), contribution: money(e?.contribution), grant: money(e?.grant), bond: money(e?.bond) }))
    .filter((e) => e.year)
    .sort((a, b) => a.year - b.year);
  return {
    birthYear: year(r.birthYear, 1900, thisYear),
    dtcYear: year(r.dtcYear, FIRST_YEAR, thisYear),
    band: BANDS.includes(r.band) ? r.band : null,
    entries,
  };
}

const sum = (list, key) => Math.round(list.reduce((a, e) => a + e[key], 0) * 100) / 100;

function deriveRdsp(raw, now = new Date()) {
  const p = cleanRdsp(raw, now);
  if (!p.birthYear || !p.band) return null;
  const thisYear = now.getFullYear();
  const e = ENTITLEMENT[p.band];
  const lastYear = p.birthYear + LAST_AGE;
  const start = Math.max(FIRST_YEAR, p.dtcYear || thisYear);
  const paid = { grant: sum(p.entries, 'grant'), bond: sum(p.entries, 'bond'), contribution: sum(p.entries, 'contribution') };
  const lifetime = {
    grant: { got: paid.grant, cap: GRANT_LIFETIME, left: Math.max(0, GRANT_LIFETIME - paid.grant) },
    bond: { got: paid.bond, cap: BOND_LIFETIME, left: Math.max(0, BOND_LIFETIME - paid.bond) },
    contribution: { got: paid.contribution, cap: CONTRIBUTION_LIFETIME, left: Math.max(0, CONTRIBUTION_LIFETIME - paid.contribution) },
  };
  const base = { thisYear, lastYear, band: p.band, lifetime, entries: p.entries, needsDtc: !p.dtcYear };
  if (thisYear > lastYear) return { ...base, eligible: false, missing: 0, grantLeft: 0, bondLeft: 0, carry: { grant: 0, bond: 0, years: 0 }, putToMax: 0 };

  // Carry forward: the unused part of each earlier year inside the 10 year window.
  // Later payments for old years are not tagged, so total paid over the same
  // span is netted off the total entitlement.
  const from = Math.max(start, thisYear - CARRY_YEARS);
  const past = [];
  for (let y = from; y < thisYear && y <= lastYear; y++) past.push(y);
  const paidPast = p.entries.filter((x) => x.year >= from && x.year < thisYear);
  const carry = {
    grant: Math.max(0, past.length * e.grant - sum(paidPast, 'grant')),
    bond: Math.max(0, past.length * e.bond - sum(paidPast, 'bond')),
    years: past.length,
  };
  const now_ = p.entries.filter((x) => x.year === thisYear);
  const got = { grant: sum(now_, 'grant'), bond: sum(now_, 'bond'), contribution: sum(now_, 'contribution') };
  const grantLeft = Math.min(lifetime.grant.left, Math.max(0, Math.min(GRANT_YEARLY_MAX, e.grant + carry.grant) - got.grant));
  const bondLeft = Math.min(lifetime.bond.left, Math.max(0, Math.min(BOND_YEARLY_MAX, e.bond + carry.bond) - got.bond));
  return {
    ...base, eligible: true, got, carry,
    yearly: { grant: e.grant, bond: e.bond, put: e.put },
    grantLeft, bondLeft,
    putToMax: Math.min(lifetime.contribution.left, Math.ceil(grantLeft * e.put / e.grant)),
    missing: grantLeft + bondLeft,
    yearsLeft: lastYear - thisYear + 1,
  };
}

module.exports = { deriveRdsp, cleanRdsp, BANDS, ENTITLEMENT };
