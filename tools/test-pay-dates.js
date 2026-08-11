const assert = require('assert');
const { CHEQUE_ISSUE_DATES, nextPaymentDate } = require('../src/pay-dates');

let passed = 0;
const t = (name, fn) => { fn(); console.log(`  [OK] ${name}`); passed++; };

// The BC schedule is published, not computed -- these are transcription checks.
t('every issue date is a Wednesday (invariant of the BC schedule)', () => {
  for (const d of CHEQUE_ISSUE_DATES) {
    const [y, m, day] = d.split('-').map(Number);
    assert.strictEqual(new Date(y, m - 1, day).getDay(), 3, `${d} is not a Wednesday`);
  }
});

t('schedule is sorted and has one date per month of the year', () => {
  assert.deepStrictEqual([...CHEQUE_ISSUE_DATES].sort(), CHEQUE_ISSUE_DATES);
  assert.strictEqual(new Set(CHEQUE_ISSUE_DATES.map((d) => d.slice(0, 7))).size, CHEQUE_ISSUE_DATES.length);
});

t('picks the next issue date on or after today', () => {
  assert.strictEqual(nextPaymentDate(new Date(2026, 7, 10)), '2026-08-26');
});

t('an issue date counts as still upcoming on the day itself', () => {
  assert.strictEqual(nextPaymentDate(new Date(2026, 7, 26)), '2026-08-26');
});

t('rolls to the next scheduled date the day after an issue date', () => {
  assert.strictEqual(nextPaymentDate(new Date(2026, 7, 27)), '2026-09-23');
});

t('returns null past the end of the published schedule, never a guessed date', () => {
  assert.strictEqual(nextPaymentDate(new Date(2026, 11, 17)), null);
  assert.strictEqual(nextPaymentDate(new Date(2027, 2, 1)), null);
});

t('signals exhaustion so the operator knows to refresh the schedule', () => {
  let warned = 0;
  nextPaymentDate(new Date(2027, 2, 1), () => { warned++; });
  nextPaymentDate(new Date(2026, 7, 10), () => { warned++; });
  assert.strictEqual(warned, 1);
});

console.log(`\n${passed} passed, 0 failed`);
