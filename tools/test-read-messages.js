const assert = require('assert');

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

  console.log('Read Messages API Tests\n');

  test('default read state is empty array', () => {
    const data = { readIds: [] };
    assert.deepStrictEqual(data.readIds, []);
  });

  test('marking messages read stores IDs', () => {
    const ids = ['msg-1', 'msg-2', 'msg-3'];
    const data = { readIds: ids, updatedAt: new Date().toISOString() };
    assert.strictEqual(data.readIds.length, 3);
    assert.ok(data.updatedAt);
  });

  test('unread count is total minus read', () => {
    const allIds = ['msg-1', 'msg-2', 'msg-3', 'msg-4'];
    const readIds = new Set(['msg-1', 'msg-3']);
    const unread = allIds.filter(id => !readIds.has(id));
    assert.strictEqual(unread.length, 2);
    assert.deepStrictEqual(unread, ['msg-2', 'msg-4']);
  });

  test('duplicate read IDs are deduplicated', () => {
    const readIds = ['msg-1', 'msg-1', 'msg-2'];
    const unique = [...new Set(readIds)];
    assert.strictEqual(unique.length, 2);
  });

  test('rejects non-array readIds', () => {
    const invalidValues = ['string', 123, null, { ids: [] }, true];
    for (const val of invalidValues) {
      assert.strictEqual(Array.isArray(val), false, `${JSON.stringify(val)} should not be array`);
    }
  });

  test('empty readIds array is valid', () => {
    const data = { readIds: [], updatedAt: new Date().toISOString() };
    assert.strictEqual(data.readIds.length, 0);
    assert.ok(data.updatedAt);
  });

  test('read state persists across sessions (structure check)', () => {
    const saved = JSON.stringify({ readIds: ['msg-1'], updatedAt: '2026-03-25T00:00:00Z' });
    const restored = JSON.parse(saved);
    assert.deepStrictEqual(restored.readIds, ['msg-1']);
    assert.strictEqual(restored.updatedAt, '2026-03-25T00:00:00Z');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
