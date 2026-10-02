const assert = require('assert');
const { deriveMissedPayment } = require('../src/programs/missed');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const day = (s) => new Date(`${s}T10:00:00`);
const base = { onAssistance: true, paidMonths: {}, reportMonths: { '2026-10': 'filed' } };

test('nothing happens on the cheque day itself', () => {
  assert.strictEqual(deriveMissedPayment({ ...base, now: day('2026-10-21') }).missed, null);
});

test('the day after an unconfirmed cheque is a miss, with the script', () => {
  const { missed } = deriveMissedPayment({ ...base, now: day('2026-10-22') });
  assert.strictEqual(missed.due, '2026-10-21');
  assert.strictEqual(missed.daysLate, 1);
  assert.strictEqual(missed.cause, null, 'report was filed, so no cause is guessed');
  assert.ok(missed.say.includes('October 21') && missed.phone === '1-866-866-0800' && missed.steps.length === 5);
});

test('marking it received clears the alert, even under next month\'s key', () => {
  const paid = { '2026-10': '2026-10-21T18:00:00.000Z' };
  assert.strictEqual(deriveMissedPayment({ ...base, paidMonths: paid, now: day('2026-10-23') }).missed, null);
  const late = { '2026-11': '2026-12-17T18:00:00.000Z' };
  assert.strictEqual(deriveMissedPayment({ ...base, paidMonths: late, now: day('2026-12-18') }).missed, null);
});

test('a mark made before the cheque date does not count', () => {
  const old = { '2026-09': '2026-09-23T18:00:00.000Z' };
  assert.ok(deriveMissedPayment({ ...base, paidMonths: old, now: day('2026-10-22') }).missed);
});

test('an unfiled report is named as the likely cause', () => {
  const { missed } = deriveMissedPayment({ ...base, reportMonths: {}, now: day('2026-10-22') });
  assert.ok(missed.cause.includes('October report'));
});

test('stops chasing after two weeks', () => {
  assert.ok(deriveMissedPayment({ ...base, now: day('2026-11-04') }).missed);
  assert.strictEqual(deriveMissedPayment({ ...base, now: day('2026-11-05') }).missed, null);
});

test('someone with no history is never alerted', () => {
  const r = deriveMissedPayment({ now: day('2026-10-22') });
  assert.deepStrictEqual(r, { missed: null, watch: [] });
});

test('a person who has marked payments before is treated as on assistance', () => {
  assert.ok(deriveMissedPayment({ paidMonths: { '2026-09': '2026-09-24T00:00:00.000Z' }, now: day('2026-10-22') }).missed);
});

test('watch lists the next two cheques with the reminder day after each', () => {
  const { watch } = deriveMissedPayment({ ...base, now: day('2026-10-02') });
  assert.deepStrictEqual(watch, [
    { date: '2026-10-21', month: '2026-10', fireOn: '2026-10-22' },
    { date: '2026-11-18', month: '2026-11', fireOn: '2026-11-19' },
  ]);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
