const assert = require('assert');
const { listRequests, REQUESTS } = require('../src/programs/requests');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };

test('the five common requests plus cheque and documents are there', () => {
  assert.deepStrictEqual(listRequests().map((r) => r.id), ['crisis', 'address', 'shelter', 'bank', 'cheque', 'ids']);
});

test('every request is complete and in plain words', () => {
  for (const r of REQUESTS) {
    assert.ok(r.name && r.when && r.say && r.note, r.id);
    assert.ok(r.ready.length >= 2, `${r.id} needs a ready list`);
    assert.ok(/^https:\/\//.test(r.link) && r.phone === '1-866-866-0800', r.id);
    assert.ok(!JSON.stringify(r).includes('—'), `${r.id} has an em dash`);
    assert.ok(r.say.length < 400, `${r.id} script is too long to say on a call`);
  }
});

test('the crisis request quotes the real food and clothing limits', () => {
  const c = REQUESTS.find((r) => r.id === 'crisis');
  assert.ok(c.note.includes('$50') && c.note.includes('$110'));
});

test('listing returns copies so callers cannot change the catalogue', () => {
  const a = listRequests(); a[0].say = 'changed';
  assert.notStrictEqual(listRequests()[0].say, 'changed');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
