const assert = require('assert');
const { deriveLife, cleanLife } = require('../src/programs/lifechange');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);

test('no birth date, no 65 timeline, but the moving steps are always there', () => {
  const d = deriveLife({}, now);
  assert.strictEqual(d.turning65, null);
  assert.ok(d.leaving.steps.length >= 5);
});

test('born March 1962: turns 65 in March 2027, five months away, apply now', () => {
  const t = deriveLife({ birthYear: 1962, birthMonth: 3 }, now).turning65;
  assert.deepStrictEqual([t.turns, t.monthsAway, t.stage], ['2027-03', 5, 'apply']);
  assert.strictEqual(t.applyFrom, '2026-04');      // the month after you turn 64
  assert.strictEqual(t.applyBy, '2026-09');        // six months before
  assert.strictEqual(t.headline, 'You turn 65 in March 2027');
  assert.ok(t.say.includes('March 2027'));
});

test('the stages as the date gets closer', () => {
  const stage = (y, m) => deriveLife({ birthYear: y, birthMonth: m }, now).turning65.stage;
  assert.strictEqual(stage(1990, 5), 'far');       // 2055
  assert.strictEqual(stage(1963, 9), 'prepare');   // Sep 2028, 23 months
  assert.strictEqual(stage(1962, 8), 'open');      // Aug 2027, 10 months
  assert.strictEqual(stage(1961, 10), 'now');      // already 65
  assert.strictEqual(deriveLife({ birthYear: 1962, birthMonth: 11 }, now).turning65.headline, 'You turn 65 in November 2027');
});

test('already 65: plain headline, nothing negative', () => {
  const t = deriveLife({ birthYear: 1950, birthMonth: 1 }, now).turning65;
  assert.strictEqual(t.monthsAway < 0, true);
  assert.strictEqual(t.headline, 'You are 65 or older');
});

test('next month reads naturally', () => {
  assert.strictEqual(deriveLife({ birthYear: 1961, birthMonth: 11 }, now).turning65.headline, 'You turn 65 next month');
});

test('moving: medical coverage runs to the end of the second month after you leave', () => {
  assert.strictEqual(deriveLife({ leaveDate: '2026-11-15' }, now).leaving.mspEnds, '2027-01-31');
  assert.strictEqual(deriveLife({ leaveDate: '2026-12-31' }, now).leaving.mspEnds, '2027-02-28');
  assert.strictEqual(deriveLife({ leaveDate: '2026-11-15' }, now).leaving.steps.some((s) => s.includes('2027-01-31')), true);
  assert.strictEqual(deriveLife({}, now).leaving.mspEnds, null);
});

test('junk input is dropped', () => {
  assert.deepStrictEqual(cleanLife({ birthYear: 'x', birthMonth: 13, leaveDate: 'soon' }, now), { birthYear: null, birthMonth: null, leaveDate: null });
  assert.deepStrictEqual(cleanLife({ birthYear: 2999, birthMonth: 1 }, now).birthYear, null);
});

test('no em dashes anywhere', () => assert.ok(!JSON.stringify(deriveLife({ birthYear: 1962, birthMonth: 3, leaveDate: '2026-11-15' }, now)).includes('—')));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
