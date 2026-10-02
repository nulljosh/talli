const assert = require('assert');
const { draftReply, KINDS } = require('../src/programs/reply');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const kind = (t) => draftReply(t).kind;

test('real-looking ministry messages land in the right bucket', () => {
  assert.strictEqual(kind('Your application for Persons with Disabilities designation has been denied.'), 'decision');
  assert.strictEqual(kind('You have received an overpayment of $412.00. Please contact us to arrange repayment.'), 'overpayment');
  assert.strictEqual(kind('Please provide your bank statements for August by October 15.'), 'documents');
  assert.strictEqual(kind('We have scheduled an appointment with you on Oct 20 at 10:30.'), 'appointment');
  assert.strictEqual(kind('Remember to declare any annual increases to your income on your Monthly Report'), 'report');
  assert.strictEqual(kind('Please confirm your current address and direct deposit information.'), 'details');
  assert.strictEqual(kind('Thank you for choosing My Self Serve.'), 'general');
});

test('a decision wins over a report mention in the same message', () => {
  assert.strictEqual(kind('Your cheque was cancelled because your monthly report was not received.'), 'decision');
});

test('every reply is signed, has placeholders, no em dashes, and says Talli does not send it', () => {
  const samples = { decision: 'Your claim was denied', overpayment: 'You owe an overpayment', documents: 'Please provide proof', appointment: 'Your appointment is booked', report: 'Your monthly report', details: 'Confirm your address', general: 'Hello there' };
  assert.deepStrictEqual(Object.keys(samples).sort(), [...KINDS.map((k) => k.kind), 'general'].sort());
  for (const [k, text] of Object.entries(samples)) {
    const d = draftReply(text);
    assert.strictEqual(d.kind, k);
    assert.ok(d.reply.includes('[your name]') && d.reply.includes('['), k);
    assert.ok(!JSON.stringify(d).includes('\u2014'), `${k} has an em dash`);
    assert.ok(d.note.includes('You send it'));
    assert.ok(d.link.startsWith('https://') && d.phone === '1-866-866-0800');
  }
});

test('the documents reply points at the vault, the decision reply at the helper', () => {
  assert.ok(draftReply('Please provide proof of rent').extra.join(' ').includes('vault'));
  assert.ok(draftReply('Your claim is denied').extra.join(' ').includes('Reconsideration helper'));
});

test('empty and huge input', () => {
  assert.strictEqual(draftReply(''), null);
  assert.strictEqual(draftReply(null), null);
  assert.ok(draftReply('denied '.repeat(5000)).kind === 'decision');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
