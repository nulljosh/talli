const assert = require('assert');
const { PROVINCES, getProvince, listProvinces, monthlyDeduction, describeRule } = require('../src/programs/provinces');
const { deriveWhatIf } = require('../src/programs/whatif');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);
const opts = { base: 1, household: 'single', now };

test('every province file is complete and its tiers make sense', () => {
  for (const p of Object.values(PROVINCES)) {
    assert.ok(p.code && p.name && p.program && p.monthlySingle > 0 && /^https:\/\//.test(p.apply), p.code);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.asOf), p.code);
    if (p.earnings.kind === 'monthly') {
      for (const tiers of [p.earnings.tiers, p.earnings.familyTiers].filter(Boolean)) {
        assert.strictEqual(tiers.at(-1).upTo, null, `${p.code} last tier is open ended`);
        tiers.forEach((t, i) => { assert.ok(t.keep >= 0 && t.keep <= 1); if (i) assert.ok(tiers[i - 1].upTo < (t.upTo ?? Infinity), `${p.code} tiers ascend`); });
      }
    }
    assert.ok(!JSON.stringify(p).includes('—'), `${p.code} has an em dash`);
    for (const url of p.sources) assert.ok(url.startsWith('https://'));
  }
});

test('getProvince is forgiving about case and strict about unknowns', () => {
  assert.strictEqual(getProvince('AB').code, 'ab');
  assert.strictEqual(getProvince('xx'), null);
  assert.strictEqual(getProvince(undefined), null);
});

test('monthly deductions: Alberta tiers and Ontario 25 cents', () => {
  const ab = PROVINCES.ab.earnings.tiers, on = PROVINCES.on.earnings.tiers;
  assert.strictEqual(monthlyDeduction(ab, 1000), 0);
  assert.strictEqual(monthlyDeduction(ab, 2009), 468.5);          // half of the 937 above 1,072
  assert.strictEqual(monthlyDeduction(ab, 2500), 959.5);          // plus a dollar for each of the last 491
  assert.strictEqual(monthlyDeduction(on, 1000), 0);
  assert.strictEqual(monthlyDeduction(on, 1500), 375);            // 75 cents of each dollar over 1,000
  assert.strictEqual(monthlyDeduction(on, 0), 0);
});

test('Alberta families get the bigger monthly allowance', () => {
  const single = deriveWhatIf({ wage: 25, hours: 30, start: '2026-11', province: 'ab' }, opts);
  const family = deriveWhatIf({ wage: 25, hours: 30, start: '2026-11', province: 'ab' }, { ...opts, household: 'couple_one' });
  assert.ok(family.rows[0].reduction < single.rows[0].reduction);
});

test('what-if in Alberta: $25 at 30 hours loses $1,709.50 a month and keeps 47%', () => {
  const d = deriveWhatIf({ wage: 25, hours: 30, start: '2026-11', province: 'ab' }, opts);
  assert.strictEqual(d.base, 1940);
  assert.deepStrictEqual([d.rows[0].reduction, d.rows[0].assistance, d.keepPct], [1709.5, 230.5, 47]);
  assert.strictEqual(d.province.code, 'ab');
  assert.ok(d.rule.includes('$1,072') && d.rule.includes('$2,009'));
});

test('what-if in Ontario: $20 at 20 hours loses $550 a month; room is the first $1,000', () => {
  const d = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11', province: 'on' }, opts);
  assert.deepStrictEqual([d.base, d.rows[0].reduction, d.rows[0].assistance, d.room], [1436, 550, 886, 1000]);
  assert.strictEqual(d.safeHours, 11.54);
  assert.strictEqual(d.monthlyRule, true);
});

test('a small job under the first tier costs nothing in either province', () => {
  for (const province of ['ab', 'on']) {
    const d = deriveWhatIf({ wage: 15, hours: 10, start: '2026-11', province }, opts);   // about $650 a month
    assert.strictEqual(d.totalReduction, 0, province);
    assert.strictEqual(d.firstClawback, null);
  }
});

test('an unknown province falls back to BC', () => {
  const d = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11', province: 'zz' }, { ...opts, base: 1483.5 });
  assert.strictEqual(d.input.province, 'bc');
});

test('listProvinces gives the screen everything it needs, in plain words', () => {
  const list = listProvinces();
  assert.deepStrictEqual(list.map((p) => p.code), ['bc', 'ab', 'on']);
  assert.ok(list.find((p) => p.code === 'on').rule.includes('25 cents'));
  assert.ok(describeRule(PROVINCES.bc).includes('yearly limit'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
