const assert = require('assert');
const {
  createCorsOptionsDelegate,
  getOriginHost,
  getRequestHost,
  isOriginAllowed,
  parseAllowedOrigins
} = require('../src/cors-utils');

function run() {
  const parsed = parseAllowedOrigins(
    undefined,
    'http://localhost:3000, http://127.0.0.1:3000, https://talli-production.vercel.app'
  );
  assert.deepStrictEqual(parsed, [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://talli-production.vercel.app'
  ]);

  assert.strictEqual(getOriginHost('https://talli-production.vercel.app/login'), 'talli-production.vercel.app');
  assert.strictEqual(getOriginHost('not-a-url'), '');

  const reqA = { headers: { host: 'talli-production.vercel.app' } };
  const reqB = { headers: { host: 'localhost:3000', 'x-forwarded-host': 'talli-production.vercel.app' } };
  assert.strictEqual(getRequestHost(reqA), 'talli-production.vercel.app');
  assert.strictEqual(getRequestHost(reqB), 'talli-production.vercel.app');

  assert.strictEqual(
    isOriginAllowed('https://talli-production.vercel.app', 'talli-production.vercel.app', parsed),
    true
  );
  assert.strictEqual(
    isOriginAllowed('https://evil.example', 'talli-production.vercel.app', parsed),
    false
  );
  assert.strictEqual(
    isOriginAllowed('https://foo.vercel.app', 'foo.vercel.app', parsed),
    true
  );
  assert.strictEqual(
    isOriginAllowed(undefined, 'foo.vercel.app', parsed),
    true
  );

  const delegate = createCorsOptionsDelegate(parsed);

  delegate(
    { headers: { host: 'talli-production.vercel.app', origin: 'https://talli-production.vercel.app' } },
    (error, options) => {
      assert.ifError(error);
      assert.deepStrictEqual(options, { origin: true });
    }
  );

  delegate(
    { headers: { host: 'talli-production.vercel.app', origin: 'https://unknown.example' } },
    (error, options) => {
      assert(error instanceof Error);
      assert.strictEqual(error.message, 'CORS origin not allowed');
      assert.strictEqual(options, undefined);
    }
  );

  console.log('CORS utility tests passed');
}

run();
