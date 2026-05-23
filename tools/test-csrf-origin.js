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

  console.log('CSRF Origin Check Tests\n');

  // Simulate the middleware logic
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://tally-production.vercel.app',
    'https://tally.heyitsmejosh.com'
  ];
  const ALLOWED_ORIGINS = new Set(allowedOrigins);

  function checkOrigin(method, origin) {
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'pass';
    if (!origin) return 'pass';
    if (ALLOWED_ORIGINS.has(origin)) return 'pass';
    return 'blocked';
  }

  test('GET requests always pass', () => {
    assert.strictEqual(checkOrigin('GET', 'https://evil.com'), 'pass');
  });

  test('HEAD requests always pass', () => {
    assert.strictEqual(checkOrigin('HEAD', 'https://evil.com'), 'pass');
  });

  test('OPTIONS requests always pass', () => {
    assert.strictEqual(checkOrigin('OPTIONS', 'https://evil.com'), 'pass');
  });

  test('POST with no origin passes (iOS/curl)', () => {
    assert.strictEqual(checkOrigin('POST', null), 'pass');
    assert.strictEqual(checkOrigin('POST', undefined), 'pass');
  });

  test('POST from localhost:3000 passes', () => {
    assert.strictEqual(checkOrigin('POST', 'http://localhost:3000'), 'pass');
  });

  test('POST from production origin passes', () => {
    assert.strictEqual(checkOrigin('POST', 'https://tally.heyitsmejosh.com'), 'pass');
  });

  test('POST from Vercel preview passes', () => {
    assert.strictEqual(checkOrigin('POST', 'https://tally-production.vercel.app'), 'pass');
  });

  test('POST from evil origin is blocked', () => {
    assert.strictEqual(checkOrigin('POST', 'https://evil.com'), 'blocked');
  });

  test('POST from similar domain is blocked', () => {
    assert.strictEqual(checkOrigin('POST', 'https://tally.heyitsmejosh.com.evil.com'), 'blocked');
  });

  test('POST from http instead of https is blocked', () => {
    assert.strictEqual(checkOrigin('POST', 'http://tally.heyitsmejosh.com'), 'blocked');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
