const assert = require('assert');
const { deriveHousehold, cleanHousehold, withRentHistory } = require('../src/programs/household');
const { deriveEarnings } = require('../src/programs/profiles');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);

test('no household type, no answer', () => assert.strictEqual(deriveHousehold({}, { now }), null));

test('single person: the ministry table numbers', () => {
  const d = deriveHousehold({ type: 'single', rent: 800 }, { now });
  assert.strictEqual(d.unit, 1);
  assert.strictEqual(d.support, 983.5);
  assert.deepStrictEqual([d.shelter.min, d.shelter.max, d.shelter.paid], [75, 500, 500]);
  assert.strictEqual(d.youCover, 300);               // rent above the maximum comes out of support
  assert.strictEqual(d.expected, 1483.5);
  assert.strictEqual(d.monthlyMax, 1483.5);
  assert.strictEqual(d.earningsExemption, 16200);
});

test('rent below the maximum is paid as it is; below the minimum is lifted to it', () => {
  assert.strictEqual(deriveHousehold({ type: 'single', rent: 400 }, { now }).shelter.paid, 400);
  assert.strictEqual(deriveHousehold({ type: 'single', rent: 50 }, { now }).shelter.paid, 75);
  assert.strictEqual(deriveHousehold({ type: 'single', rent: 400 }, { now }).youCover, 0);
});

test('couples: one PWD and both PWD, shared earnings exemption', () => {
  const one = deriveHousehold({ type: 'couple_one', rent: 700 }, { now });
  assert.deepStrictEqual([one.unit, one.support, one.shelter.max, one.earningsExemption, one.shared, one.transport], [2, 1543.5, 695, 23400, true, 52]);
  const both = deriveHousehold({ type: 'couple_both', rent: 700 }, { now });
  assert.deepStrictEqual([both.support, both.earningsExemption, both.transport], [1967, 32400, 104]);
});

test('children raise the unit size, the support and the shelter maximum', () => {
  const d = deriveHousehold({ type: 'couple_both', children: 2, rent: 1500 }, { now });
  assert.deepStrictEqual([d.unit, d.support, d.shelter.max, d.shelter.min], [4, 2067, 840, 225]);
  assert.strictEqual(d.youCover, 660);
});

test('single parent always has at least one child, and no exemption is claimed', () => {
  const d = deriveHousehold({ type: 'single_parent', children: 0 }, { now });
  assert.strictEqual(d.children, 1);
  assert.strictEqual(d.unit, 2);
  assert.strictEqual(d.earningsExemption, null);
});

test('past ten people the limits grow by $25 and $50 each', () => {
  const d = deriveHousehold({ type: 'couple_one', children: 10 }, { now });   // unit 12
  assert.deepStrictEqual([d.unit, d.shelter.min, d.shelter.max], [12, 425, 1240]);
});

test('a wrong cheque is flagged, with the words to say', () => {
  const d = deriveHousehold({ type: 'single', rent: 500 }, { now, actual: 1400 });
  assert.deepStrictEqual(d.mismatch, { expected: 1483.5, actual: 1400, diff: -83.5 });
  assert.ok(d.say.includes('$1400.00') && d.say.includes('$1483.50'));
});

test('a cheque that matches the table, or the table plus the bus supplement, is fine', () => {
  assert.strictEqual(deriveHousehold({ type: 'single', rent: 500 }, { now, actual: 1483.5 }).mismatch, null);
  assert.strictEqual(deriveHousehold({ type: 'single', rent: 500 }, { now, actual: 1535.5 }).mismatch, null);
  assert.strictEqual(deriveHousehold({ type: 'single' }, { now, actual: 1000 }).mismatch, null, 'no rent, nothing to compare');
});

test('the earnings tracker uses the household exemption', () => {
  const e = { entries: [{ date: '2026-03-01', amount: 20000 }] };
  assert.strictEqual(deriveEarnings(e, now).over, true);                      // single: 16,200
  assert.strictEqual(deriveEarnings(e, now, 'couple_one').over, false);       // couple: 23,400
  assert.strictEqual(deriveEarnings(e, now, 'couple_both').left, 12400);
  assert.strictEqual(deriveEarnings(e, now, 'single_parent').exemption, null);
});

test('rent history records a change once', () => {
  const first = withRentHistory({}, { type: 'single', rent: 700 }, now);
  assert.deepStrictEqual(first.history, [{ date: '2026-10-02', rent: 700 }]);
  assert.strictEqual(withRentHistory(first, { type: 'single', rent: 700 }, now).history.length, 1);
  assert.strictEqual(withRentHistory(first, { type: 'single', rent: 750 }, new Date(2026, 10, 1)).history.length, 2);
});

test('junk input is dropped', () => {
  assert.deepStrictEqual(cleanHousehold({ type: 'wizard', children: 99, rent: -5, history: [{ date: 'x', rent: 5 }] }, now), { type: null, children: 10, rent: null, history: [] });
  assert.strictEqual(cleanHousehold({ type: 'single', children: 3 }, now).children, 0);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
