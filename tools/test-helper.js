const assert = require('assert');
const H = require('../src/programs/helper');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);

test('tokens are 256 bits, unique, URL safe, and only the hash is meant to be stored', () => {
  const a = H.newToken(), b = H.newToken();
  assert.notStrictEqual(a, b);
  assert.ok(H.validToken(a) && a.length === 43);
  assert.strictEqual(H.hashToken(a).length, 64);
  assert.notStrictEqual(H.hashToken(a), a);
  assert.strictEqual(H.hashToken(a), H.hashToken(a));
});

test('anything that is not a token is rejected before any lookup', () => {
  for (const bad of [undefined, null, '', 'short', 'x'.repeat(44), '../../etc/passwd', 'a'.repeat(42) + '!', 42]) assert.strictEqual(H.validToken(bad), false);
});

test('names are trimmed, stripped of control characters and angle brackets, and capped', () => {
  assert.strictEqual(H.cleanName('  Sam <b>(advocate)</b>\n  '), 'Sam b(advocate)/b');
  assert.strictEqual(H.cleanName('x'.repeat(100)).length, 40);
  assert.strictEqual(H.cleanName(null), '');
});

test('links last 90 days and expire the day after', () => {
  assert.strictEqual(H.expiryFrom(now), '2026-12-31');          // Oct 2 plus 90 days
  assert.strictEqual(H.isExpired('2026-12-31', new Date(2026, 11, 31)), false);
  assert.strictEqual(H.isExpired('2026-12-31', new Date(2027, 0, 1)), true);
  assert.strictEqual(H.isExpired(undefined, now), true);
  assert.strictEqual(H.isExpired('garbage', now), true);
});

test('the view carries payment timing and statuses, and nothing personal', () => {
  const v = H.buildHelperView({
    pwd: { status: 'approved', deniedDate: '2026-05-01', notes: 'private' },
    rdsp: { status: 'account_opened', accountNumber: '123456' },
    cdb: { status: 'applied' },
    income: { pwdMonthly: 1483.5, cdbMonthly: 200, totalMonthly: 1683.5, yearTotal: 99999 },
    reportMonths: { '2026-10': 'filed' }, expiresAt: '2027-01-01', now,
  });
  assert.deepStrictEqual(v.monthly, { pwd: 1483.5, cdb: 200, total: 1683.5 });
  assert.strictEqual(v.nextPayment, '2026-10-21');
  assert.deepStrictEqual(v.programs.map((p) => p.status), ['Approved', 'Account opened', 'Applied']);
  assert.deepStrictEqual(v.report, { month: '2026-10', filed: true });
  const text = JSON.stringify(v);
  for (const leak of ['private', '123456', '2026-05-01', '99999', 'notes', 'accountNumber', 'deniedDate']) assert.ok(!text.includes(leak), `leaked ${leak}`);
  assert.ok(v.readOnly);
});

test('missing data shows a safe default, not a crash', () => {
  const v = H.buildHelperView({ expiresAt: '2027-01-01', now });
  assert.strictEqual(v.monthly, null);
  assert.deepStrictEqual(v.programs.map((p) => p.status), ['Applied', 'Not started', 'Not applied']);
  assert.strictEqual(v.report.filed, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
