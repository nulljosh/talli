const assert = require('assert');
const { deriveRdsp, cleanRdsp } = require('../src/programs/rdsp');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);
const low = { birthYear: 1990, dtcYear: 2020, band: 'low' };

test('needs birth year and band', () => {
  assert.strictEqual(deriveRdsp({}, now), null);
  assert.strictEqual(deriveRdsp({ birthYear: 1990 }, now), null);
});

test('low income, six years of DTC, nothing paid: carry forward hits the yearly caps', () => {
  const d = deriveRdsp({ ...low, entries: [] }, now);
  assert.deepStrictEqual(d.carry, { grant: 21000, bond: 6000, years: 6 });
  assert.strictEqual(d.grantLeft, 10500);   // capped at the yearly max
  assert.strictEqual(d.bondLeft, 7000);     // 1,000 this year + 6,000 carried
  assert.strictEqual(d.putToMax, 4500);     // 3 x $1,500 unlocks $10,500
  assert.strictEqual(d.missing, 17500);
});

test('this year already paid reduces what is left, and next year carries more', () => {
  const entries = [{ year: 2026, contribution: 1500, grant: 3500, bond: 1000 }];
  const d = deriveRdsp({ ...low, entries }, now);
  assert.strictEqual(d.grantLeft, 7000);
  assert.strictEqual(d.bondLeft, 6000);
  assert.strictEqual(d.putToMax, 3000);
  const next = deriveRdsp({ ...low, entries }, new Date(2027, 0, 15));
  assert.strictEqual(next.carry.grant, 7 * 3500 - 3500);
});

test('carry forward only reaches back 10 years', () => {
  const d = deriveRdsp({ birthYear: 1980, dtcYear: 2009, band: 'low' }, now);
  assert.strictEqual(d.carry.years, 10);
  assert.strictEqual(d.carry.grant, 35000);
});

test('high income gets the smaller grant and no bond', () => {
  const d = deriveRdsp({ birthYear: 1990, dtcYear: 2026, band: 'high' }, now);
  assert.strictEqual(d.grantLeft, 1000);
  assert.strictEqual(d.bondLeft, 0);
  assert.strictEqual(d.putToMax, 1000);
});

test('lifetime cap trims what is left', () => {
  const d = deriveRdsp({ ...low, entries: [{ year: 2025, contribution: 0, grant: 69000, bond: 0 }] }, now);
  assert.strictEqual(d.grantLeft, 1000);
});

test('past the year you turn 49 nothing is left', () => {
  const d = deriveRdsp({ birthYear: 1970, dtcYear: 2015, band: 'low' }, now);
  assert.strictEqual(d.eligible, false);
  assert.strictEqual(d.missing, 0);
});

test('unknown DTC year is flagged and counts only this year', () => {
  const d = deriveRdsp({ birthYear: 1990, band: 'low' }, now);
  assert.strictEqual(d.needsDtc, true);
  assert.strictEqual(d.carry.years, 0);
  assert.strictEqual(d.grantLeft, 3500);
});

test('junk input is dropped', () => {
  const c = cleanRdsp({ birthYear: 'x', band: 'rich', dtcYear: 1990, entries: [{ year: 2999 }, { year: 2024, contribution: -5, grant: '12', bond: null }, null] }, now);
  assert.deepStrictEqual(c, { birthYear: null, dtcYear: null, band: null, entries: [{ year: 2024, contribution: 0, grant: 12, bond: 0 }] });
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
