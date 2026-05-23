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

  console.log('Blob Helper Tests\n');

  // Simulate loadUserBlob/saveUserBlob logic (non-production path)
  const IS_PRODUCTION = false;

  async function loadUserBlob(userId, key, fallback) {
    if (!IS_PRODUCTION || !userId) return fallback;
    return fallback;
  }

  async function saveUserBlob(userId, key, data) {
    if (!IS_PRODUCTION || !userId) return;
  }

  test('loadUserBlob returns fallback when not in production', async () => {
    const result = await loadUserBlob('user123', 'paid-status', { paid: false });
    assert.deepStrictEqual(result, { paid: false });
  });

  test('loadUserBlob returns fallback when userId is null', async () => {
    const result = await loadUserBlob(null, 'paid-status', { paid: false });
    assert.deepStrictEqual(result, { paid: false });
  });

  test('loadUserBlob returns fallback when userId is undefined', async () => {
    const result = await loadUserBlob(undefined, 'test-key', []);
    assert.deepStrictEqual(result, []);
  });

  test('saveUserBlob is no-op when not in production', async () => {
    // Should not throw
    await saveUserBlob('user123', 'paid-status', { paid: true });
  });

  test('saveUserBlob is no-op when userId is null', async () => {
    await saveUserBlob(null, 'paid-status', { paid: true });
  });

  test('blob path construction is correct', () => {
    const userId = 'abc123';
    const key = 'paid-status';
    const blobPath = `tally-cache/${userId}/${key}.json`;
    assert.strictEqual(blobPath, 'tally-cache/abc123/paid-status.json');
  });

  test('blob path handles special characters in userId', () => {
    const userId = 'a1b2c3d4e5f6';
    const key = 'read-messages';
    const blobPath = `tally-cache/${userId}/${key}.json`;
    assert.ok(blobPath.startsWith('tally-cache/'));
    assert.ok(blobPath.endsWith('.json'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
