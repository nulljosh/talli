const assert = require('assert');
const { buildOpenData } = require('../src/programs/open-data');
const { CHEQUE_ISSUE_DATES } = require('../src/pay-dates');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const d = buildOpenData();
const walk = (v, fn) => { fn(v); if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, fn)); };

test('the pay dates are exactly the ones the app uses, in order', () => {
  assert.deepStrictEqual(d.payDates.dates, CHEQUE_ISSUE_DATES);
  assert.deepStrictEqual([...d.payDates.dates].sort(), d.payDates.dates);
  assert.ok(d.payDates.dates.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)));
});

test('BC tables carry the real figures', () => {
  const da = d.bc.disabilityAssistance;
  assert.strictEqual(da.supportByFamilyUnit.single[1], 983.5);
  assert.deepStrictEqual(da.shelterByUnitSize[1], { min: 75, max: 500 });
  assert.deepStrictEqual(da.shelterByUnitSize[10], { min: 375, max: 1140 });
  assert.strictEqual(Object.keys(da.shelterByUnitSize).length, 10);
  assert.strictEqual(d.bc.earningsExemption.byYear[2026].single, 16200);
  assert.strictEqual(d.bc.supplements.find((s) => s.id === 'transport').amount, 52);
});

test('federal figures are present', () => {
  assert.strictEqual(d.federal.cdb.maxMonthly, 204.2);
  assert.strictEqual(d.federal.ccb.maxPerYear.under6, 8157);
  assert.strictEqual(d.federal.rdsp.yearlyGrantMaxWithCarryForward, 10500);
});

test('all three provinces are listed with plain-words rules', () => {
  assert.deepStrictEqual(d.provinces.map((p) => p.code), ['bc', 'ab', 'on']);
  assert.ok(d.provinces.every((p) => p.rule && p.apply.startsWith('https://')));
});

test('every source is a real https link, and nothing has an em dash', () => {
  let sources = 0;
  walk(d, (v) => { if (v && typeof v === 'object' && 'source' in v) { assert.ok(/^https:\/\//.test(v.source)); sources++; } });
  assert.ok(sources >= 6, `only ${sources} sources`);
  assert.ok(!JSON.stringify(d).includes('—'));
});

test('it survives a JSON round trip unchanged', () => assert.deepStrictEqual(JSON.parse(JSON.stringify(d)), d));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
