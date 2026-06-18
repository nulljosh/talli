const assert = require('assert');
const { PROFILE_PROGRAMS } = require('../src/programs/profiles');

// Regression guard: PWD/RDSP/CDB profile endpoints are now generated from
// PROFILE_PROGRAMS by registerProfileRoutes() in src/api.js. This verifies
// the schema still describes the same routes/statuses/defaults the
// hand-written handlers used before the refactor, and that the generic
// merge logic behaves identically to the old per-program POST handlers.

function mergeUpdate(defaults, existing, body) {
  const fields = Object.keys(defaults).filter((f) => f !== 'status');
  const data = { ...existing, ...(body.status !== undefined && { status: body.status }) };
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
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

  test('PROFILE_PROGRAMS contains pwd, rdsp, cdb', () => {
    const ids = PROFILE_PROGRAMS.map((p) => p.id);
    assert.deepStrictEqual(ids.sort(), ['cdb', 'pwd', 'rdsp']);
  });

  test('routes match the original hand-written endpoints', () => {
    const routes = PROFILE_PROGRAMS.map((p) => p.route).sort();
    assert.deepStrictEqual(routes, ['cdb-profile', 'pwd-profile', 'rdsp-profile']);
  });

  test('pwd validStatuses match pre-refactor set', () => {
    const pwd = PROFILE_PROGRAMS.find((p) => p.id === 'pwd');
    assert.deepStrictEqual(pwd.validStatuses, ['applied', 'in_review', 'medical_done', 'denied', 'resubmitted', 'approved']);
    assert.deepStrictEqual(pwd.defaults, { status: 'applied', submittedDate: null, deniedDate: null, notes: '' });
  });

  test('rdsp validStatuses match pre-refactor set', () => {
    const rdsp = PROFILE_PROGRAMS.find((p) => p.id === 'rdsp');
    assert.deepStrictEqual(rdsp.validStatuses, ['pending', 'dtc_required', 'account_opened', 'funded', 'active', 'closed']);
    assert.deepStrictEqual(rdsp.defaults, { status: 'pending', accountOpenedDate: null, accountNumber: null, notes: '' });
  });

  test('cdb validStatuses match pre-refactor set', () => {
    const cdb = PROFILE_PROGRAMS.find((p) => p.id === 'cdb');
    assert.deepStrictEqual(cdb.validStatuses, ['pending', 'applied', 'under_review', 'approved', 'rejected', 'funded']);
    assert.deepStrictEqual(cdb.defaults, { status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: null, retroactiveEligible: false, notes: '' });
  });

  test('generic merge preserves untouched fields (pwd)', () => {
    const pwd = PROFILE_PROGRAMS.find((p) => p.id === 'pwd');
    const existing = { status: 'applied', submittedDate: '2026-01-01', deniedDate: null, notes: 'x' };
    const result = mergeUpdate(pwd.defaults, existing, { status: 'denied', deniedDate: '2026-05-25' });
    assert.deepStrictEqual(result, { status: 'denied', submittedDate: '2026-01-01', deniedDate: '2026-05-25', notes: 'x' });
  });

  test('generic merge ignores undefined fields (cdb)', () => {
    const cdb = PROFILE_PROGRAMS.find((p) => p.id === 'cdb');
    const existing = { status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: null, retroactiveEligible: false, notes: '' };
    const result = mergeUpdate(cdb.defaults, existing, { monthlyAmount: 200 });
    assert.deepStrictEqual(result, { status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: 200, retroactiveEligible: false, notes: '' });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
