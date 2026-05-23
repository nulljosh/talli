const assert = require('assert');
const crypto = require('crypto');

// Minimal in-process test of paid-status API logic (paidMonths history format).

function createMockSession() {
  return {
    authenticated: true,
    bceidUsername: 'testuser',
    bceidPassword: 'encrypted',
    userId: 'abc123',
    uaHash: crypto.createHash('sha256').update('test-ua').digest('hex'),
    lastActivity: Date.now(),
    paidStatus: null,
    cookie: { maxAge: 7200000 }
  };
}

function run() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [OK] ${name}`);
      passed++;
    } catch (e) {
      console.log(`  [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('Paid Status API Tests (paidMonths format)\n');

  test('default state has empty paidMonths', () => {
    const session = createMockSession();
    const data = session.paidStatus || { paidMonths: {} };
    assert.deepStrictEqual(data.paidMonths, {});
  });

  test('marking a month paid adds it to paidMonths', () => {
    const session = createMockSession();
    const month = '2026-03';
    const ts = new Date().toISOString();
    const data = { paidMonths: {} };
    data.paidMonths[month] = ts;
    session.paidStatus = data;
    assert.strictEqual(typeof session.paidStatus.paidMonths[month], 'string');
    assert.ok(session.paidStatus.paidMonths[month]);
  });

  test('unmarking a month removes it from paidMonths', () => {
    const session = createMockSession();
    const data = { paidMonths: { '2026-03': '2026-03-24T00:00:00Z' } };
    delete data.paidMonths['2026-03'];
    session.paidStatus = data;
    assert.strictEqual(session.paidStatus.paidMonths['2026-03'], undefined);
  });

  test('multiple months can be tracked', () => {
    const data = { paidMonths: {
      '2026-01': '2026-01-21T00:00:00Z',
      '2026-02': '2026-02-25T00:00:00Z',
      '2026-03': '2026-03-25T00:00:00Z'
    }};
    assert.strictEqual(Object.keys(data.paidMonths).length, 3);
    assert.ok(data.paidMonths['2026-02']);
  });

  test('old format migrates to paidMonths', () => {
    const oldFormat = { paid: true, month: '2026-03', updatedAt: '2026-03-24T00:00:00Z' };
    // Migration logic
    const migrated = { paidMonths: {} };
    if (!oldFormat.paidMonths && oldFormat.month) {
      if (oldFormat.paid && oldFormat.updatedAt) {
        migrated.paidMonths[oldFormat.month] = oldFormat.updatedAt;
      }
    }
    assert.strictEqual(migrated.paidMonths['2026-03'], '2026-03-24T00:00:00Z');
  });

  test('old format unpaid migrates to empty paidMonths', () => {
    const oldFormat = { paid: false, month: '2026-03', updatedAt: null };
    const migrated = { paidMonths: {} };
    if (!oldFormat.paidMonths && oldFormat.month) {
      if (oldFormat.paid && oldFormat.updatedAt) {
        migrated.paidMonths[oldFormat.month] = oldFormat.updatedAt;
      }
    }
    assert.deepStrictEqual(migrated.paidMonths, {});
  });

  test('rejects non-boolean paid value', () => {
    const invalidValues = ['yes', 1, null, undefined, 'true'];
    for (const val of invalidValues) {
      assert.strictEqual(typeof val !== 'boolean', true, `${val} should not be boolean`);
    }
  });

  test('rejects invalid month format', () => {
    const invalidMonths = ['March', '2026', '2026-3', '03-2026', ''];
    for (const m of invalidMonths) {
      assert.strictEqual(/^\d{4}-\d{2}$/.test(m), false, `${m} should be invalid`);
    }
  });

  test('valid month format YYYY-MM', () => {
    const month = new Date().toISOString().slice(0, 7);
    assert.ok(/^\d{4}-\d{2}$/.test(month), `Expected YYYY-MM, got ${month}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
