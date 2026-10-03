const assert = require('assert');
const { findBenefits, prefill, PROGRAMS, QUESTIONS } = require('../src/programs/finder');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const ids = (r) => r.results.map((x) => x.id);
const base = { age: ['19to49'], dtc: ['no'], rdsp: ['no'], housing: ['rent'], kids: ['no'], work: ['never'], vehicle: ['no'], taxes: ['yes'], needs: [] };

test('every program is well formed', () => {
  const q = Object.fromEntries(QUESTIONS.map((x) => [x.id, x.options.map((o) => o.id)]));
  for (const p of PROGRAMS) {
    assert.ok(p.name && p.value && p.why && p.how.length && /^https:\/\//.test(p.link), p.id);
    for (const [k, vals] of Object.entries(p.when)) for (const v of vals) assert.ok(q[k]?.includes(v), `${p.id}: ${k}=${v}`);
    assert.ok(!JSON.stringify(p).includes('—'), `${p.id} has an em dash`);
  }
  assert.strictEqual(new Set(PROGRAMS.map((p) => p.id)).size, PROGRAMS.length);
});

test('unfinished answers return questions and no results', () => {
  const r = findBenefits({ status: ['pwd'] });
  assert.strictEqual(r.complete, false);
  assert.strictEqual(r.results.length, 0);
  assert.ok(!r.questions.some((q) => q.id === 'disability'), 'PWD skips the disability question');
});

test('PWD renter with no DTC: real numbers', () => {
  const r = findBenefits({ ...base, status: ['pwd'] });
  assert.ok(r.complete);
  for (const id of ['dtc', 'cdb', 'rdsp', 'transport', 'renters_credit', 'dental', 'winter', 'advocate']) assert.ok(ids(r).includes(id), id);
  for (const id of ['pwd', 'ia', 'fuel', 'crisis', 'cdcp', 'oas']) assert.ok(!ids(r).includes(id), `no ${id}`);
  assert.strictEqual(r.results.find((x) => x.id === 'cdb').first, 'Get the Disability Tax Credit first');
  // cdb 2450 + rdsp 1000 + transport 624 + dental 500 + renters 400 + winter 60
  assert.strictEqual(r.missingYearly, 5034);
});

test('marking a program as already received drops it from the total', () => {
  const r = findBenefits({ ...base, status: ['pwd'], have: ['transport', 'dental', 'winter', 'bogus'] });
  assert.strictEqual(r.missingYearly, 3850);
  assert.deepStrictEqual(r.answers.have, ['transport', 'dental', 'winter']);
});

test('no assistance, disabled, in crisis: PWD and IA show, only PWD is counted', () => {
  const r = findBenefits({ ...base, status: ['none'], disability: ['yes'], needs: ['crisis', 'lowincome'] });
  assert.ok(ids(r).includes('pwd') && ids(r).includes('ia') && ids(r).includes('hydro') && ids(r).includes('rentbank'));
  assert.ok(!ids(r).includes('crisis'), 'crisis supplement needs assistance');
  assert.strictEqual(r.missingYearly, 17802 + 2450 + 1000 + 400);
});

test('income assistance to PWD counts the difference', () => {
  const r = findBenefits({ ...base, status: ['ia'], disability: ['yes'], dtc: ['yes'], rdsp: ['yes'] });
  assert.strictEqual(r.results.find((x) => x.id === 'cdb').first, null);
  assert.strictEqual(r.missingYearly, 5082 + 2450 + 400 + 60);
});

test('not disabled gets no disability programs', () => {
  const r = findBenefits({ ...base, status: ['none'], disability: ['no'] });
  for (const id of ['pwd', 'dtc', 'cdb', 'rdsp', 'ferries']) assert.ok(!ids(r).includes(id), id);
});

test('junk input is dropped', () => {
  const r = findBenefits({ status: ['hacker'], nope: ['x'], age: '19to49' });
  assert.deepStrictEqual(r.answers, { status: [], age: ['19to49'] });
  assert.strictEqual(findBenefits(null).complete, false);
});

test('prefill uses what Talli already knows', () => {
  assert.deepStrictEqual(prefill({ pwd: { status: 'approved' }, dtc: { status: 'approved' }, rdsp: { status: 'none' }, cdb: { status: 'approved' } }),
    { status: ['pwd'], dtc: ['yes'], have: ['cdb'] });
});

test('federal-only mode asks seven questions and shows only federal programs', () => {
  const q = findBenefits({}, { scope: 'federal' });
  assert.deepStrictEqual(q.questions.map((x) => x.id), ['disability', 'age', 'dtc', 'rdsp', 'kids', 'work', 'taxes']);
  const r = findBenefits({ disability: ['yes'], age: ['19to49'], dtc: ['no'], rdsp: ['no'], kids: ['yes'], work: ['now'], taxes: ['yes'] }, { scope: 'federal' });
  assert.ok(r.complete);
  for (const id of ['dtc', 'cdb', 'rdsp', 'cwb', 'ccb', 'med_supplement', 'cdcp']) assert.ok(ids(r).includes(id), id);
  for (const id of ['transport', 'renters_credit', 'ferries', 'parks', 'internet', 'crisis', 'hydro', 'fuel', 'pwd', 'ia', 'kids', 'climate', 'bc_reno']) assert.ok(!ids(r).includes(id), `no ${id}`);
  assert.ok(r.missingYearly > 0);
});

test('the federal child benefit only exists in federal mode', () => {
  const bc = findBenefits({ ...base, status: ['pwd'], kids: ['yes'] });
  assert.ok(!ids(bc).includes('ccb'));
  assert.ok(ids(bc).includes('kids'));
});

test('federal mode ignores a spoofed BC status', () => {
  const r = findBenefits({ status: ['pwd'], disability: ['yes'], age: ['19to49'], dtc: ['no'], rdsp: ['no'], kids: ['no'], work: ['never'], taxes: ['yes'] }, { scope: 'federal' });
  assert.ok(!ids(r).includes('transport') && !ids(r).includes('dental'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
