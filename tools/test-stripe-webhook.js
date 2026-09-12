// Exercise the actual Express webhook handler with locally signed Stripe events.
const assert = require('node:assert/strict');
process.env.LAMBDA_TASK_ROOT = '/test';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-only-session-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = require('../src/api.js');
const route = app.router.stack.find(layer => layer.route?.path === '/api/stripe-webhook');
const handler = route.route.stack.at(-1).handle;
let writes = [], failWrite = false;
globalThis.__cfEnv = { BLOB: { put: async (key, body) => {
  if (failWrite) throw new Error('storage unavailable');
  writes.push([key, JSON.parse(body)]);
} } };
async function send(type, payment, validSignature = true) {
  const payload = JSON.stringify({ type, data: { object: payment } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const req = { body: Buffer.from(payload), headers: { 'stripe-signature': validSignature ? signature : 'invalid' } };
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res);
  return res;
}
(async () => {
  const paid = { client_reference_id: 'test-user', payment_status: 'paid' };
  assert.equal((await send('checkout.session.completed', paid, false)).code, 400);
  assert.equal(writes.length, 0);
  assert.equal((await send('checkout.session.completed', { ...paid, payment_status: 'unpaid' })).code, 200);
  assert.equal(writes.length, 0);
  assert.equal((await send('checkout.session.completed', paid)).code, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1].isPro, true);
  failWrite = true;
  assert.equal((await send('checkout.session.completed', paid)).code, 500);
  failWrite = false;
  assert.equal((await send('checkout.session.async_payment_succeeded', paid)).code, 200);
  assert.equal(writes.length, 2);
  assert.equal(writes[0][0], writes[1][0], 'duplicate deliveries must target the same entitlement');
  assert.equal((await send('checkout.session.completed', { payment_status: 'paid' })).code, 500);
  delete globalThis.__cfEnv;
  assert.equal((await send('checkout.session.completed', paid)).code, 500);
  console.log('test-stripe-webhook: 8 payment scenarios passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
