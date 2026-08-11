const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Regression test for the stale-messages bug: /api/check and /api/submit-report guard
// themselves with a module-global "in progress" flag. If any exit path fails to clear it,
// the flag stays true for the life of the serverless instance, every later request gets
// 429, no scrape ever runs again, and /api/mobile serves a frozen Blob forever (the
// symptom was a Messages tab stuck on a single message from the previous December).

let passed = 0;
const t = (name, fn) => { fn(); console.log(`  [OK] ${name}`); passed++; };

const src = fs.readFileSync(path.join(__dirname, '../src/api.js'), 'utf8');

// Source-level guard: the lock must be released in a finally, not hand-cleared per exit.
// Hand-clearing is what leaked -- three early returns in /api/check missed it.
for (const flag of ['isChecking', 'isSubmitting']) {
  t(`${flag} is released in a finally block`, () => {
    assert.ok(
      new RegExp(`finally\\s*\\{\\s*${flag} = false;\\s*\\}`).test(src),
      `${flag} has no "finally { ${flag} = false; }" -- an early return can leak the lock`
    );
  });

  t(`${flag} is never hand-cleared on an individual exit path`, () => {
    // Reassignments only -- the `let <flag> = false;` declaration is not a release.
    const assignments = src.match(new RegExp(`(?<!let )${flag} = false;`, 'g')) || [];
    assert.strictEqual(
      assignments.length, 1,
      `${flag} is cleared in ${assignments.length} places; expected exactly 1 (the finally). ` +
      'Per-exit clearing is the pattern that wedged /api/check at 429.'
    );
  });
}

// Behavioural model of the guard -> acquire -> try/finally shape the handlers use.
function makeHandler({ authenticated = true, hasCreds = true, scrapeThrows = false } = {}) {
  const state = { locked: false };
  const handler = async () => {
    if (state.locked) return { status: 429 };
    state.locked = true;
    try {
      if (!authenticated) return { status: 401 };
      if (!hasCreds) return { status: 400 };
      if (scrapeThrows) throw new Error('scrape blew up');
      return { status: 200 };
    } catch {
      return { status: 500 };
    } finally {
      state.locked = false;
    }
  };
  return { handler, state };
}

const exits = [
  ['success', {}, 200],
  ['expired session (early 401)', { authenticated: false }, 401],
  ['missing credentials (early 400)', { hasCreds: false }, 400],
  ['scrape throws', { scrapeThrows: true }, 500],
];

(async () => {
  for (const [label, opts, expectedStatus] of exits) {
    const { handler, state } = makeHandler(opts);
    const first = await handler();
    assert.strictEqual(first.status, expectedStatus, `${label}: wrong status`);
    assert.strictEqual(state.locked, false, `${label}: lock leaked -- this is the wedge bug`);
    const second = await handler();
    assert.notStrictEqual(second.status, 429, `${label}: a later request was wedged at 429`);
    console.log(`  [OK] lock released and next request allowed after: ${label}`);
    passed++;
  }

  // The guard must still reject a genuinely concurrent request.
  const state = { locked: false };
  const slow = async () => {
    if (state.locked) return { status: 429 };
    state.locked = true;
    try { await new Promise((r) => setTimeout(r, 20)); return { status: 200 }; }
    finally { state.locked = false; }
  };
  const inflight = slow();
  assert.strictEqual((await slow()).status, 429, 'concurrent request should still be rejected');
  assert.strictEqual((await inflight).status, 200);
  assert.strictEqual(state.locked, false, 'lock released after the in-flight request finished');
  console.log('  [OK] concurrent request is still rejected while one is genuinely in flight');
  passed++;

  console.log(`\n${passed} passed, 0 failed`);
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
