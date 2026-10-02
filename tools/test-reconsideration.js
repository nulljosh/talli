const assert = require('assert');
const { deriveReconsideration, addBusinessDays, businessDaysBetween, bcHolidays } = require('../src/programs/reconsideration');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const day = (s) => new Date(`${s}T10:00:00`);

test('BC statutory holidays for 2026', () => {
  const h = bcHolidays(2026);
  for (const d of ['2026-01-01', '2026-02-16', '2026-04-03', '2026-05-18', '2026-07-01', '2026-08-03', '2026-09-07', '2026-09-30', '2026-10-12', '2026-11-11', '2026-12-25']) assert.ok(h.has(d), d);
  assert.strictEqual(h.size, 11);
});

test('Good Friday and Victoria Day for other years', () => {
  assert.ok(bcHolidays(2027).has('2027-03-26'));   // Good Friday 2027
  assert.ok(bcHolidays(2027).has('2027-05-24'));   // Victoria Day 2027
  assert.ok(bcHolidays(2028).has('2028-04-14'));   // Good Friday 2028
  assert.ok(bcHolidays(2028).has('2028-05-22'));   // Victoria Day 2028
});

test('20 business days from Fri Oct 2 2026 skips Thanksgiving and ends Nov 2', () => {
  assert.strictEqual(addBusinessDays('2026-10-02', 20), '2026-11-02');
});

test('day 1 is the day after the letter, weekends do not count', () => {
  assert.strictEqual(addBusinessDays('2026-10-02', 1), '2026-10-05'); // Friday -> Monday
  assert.strictEqual(addBusinessDays('2026-10-06', 1), '2026-10-07');
});

test('deadline crosses a holiday week correctly (Christmas)', () => {
  assert.strictEqual(addBusinessDays('2026-12-22', 3), '2026-12-28'); // 23, 24, then 28 (25 holiday, 26-27 weekend)
});

test('business days left counts down and stops at zero', () => {
  assert.strictEqual(businessDaysBetween('2026-10-02', '2026-11-02'), 20);
  assert.strictEqual(businessDaysBetween('2026-11-02', '2026-11-02'), 0);
});

test('status: open, soon, today, passed', () => {
  const raw = { received: '2026-10-02' };
  assert.strictEqual(deriveReconsideration(raw, day('2026-10-03')).status, 'open');
  assert.strictEqual(deriveReconsideration(raw, day('2026-10-27')).status, 'soon');   // 4 business days left
  assert.strictEqual(deriveReconsideration(raw, day('2026-11-02')).status, 'today');
  const late = deriveReconsideration(raw, day('2026-11-03'));
  assert.strictEqual(late.status, 'passed');
  assert.strictEqual(late.left, 0);
});

test('the result carries the checklist, the letter and the real deadline', () => {
  const d = deriveReconsideration({ received: '2026-10-02' }, day('2026-10-03'));
  assert.strictEqual(d.deadline, '2026-11-02');
  assert.strictEqual(d.left, 20); // Oct 3 is a Saturday, so nothing has been used yet
  assert.ok(d.steps.length === 8 && d.steps[4].includes('November 2, 2026'));
  assert.ok(d.draft.includes('October 2, 2026') && d.draft.includes('[your full name]'));
  assert.ok(!JSON.stringify(d).includes('—'), 'no em dashes');
  assert.ok(d.links.every((l) => l.url.startsWith('https://')));
});

test('no or bad date means no result', () => {
  assert.strictEqual(deriveReconsideration({}, day('2026-10-03')), null);
  assert.strictEqual(deriveReconsideration({ received: 'soon' }, day('2026-10-03')), null);
  assert.strictEqual(deriveReconsideration(null, day('2026-10-03')), null);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
