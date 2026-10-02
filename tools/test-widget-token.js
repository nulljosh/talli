const assert = require('assert');
const { sign, verify } = require('../src/widget-token');

const id = '0123456789abcdef';
const t = sign('k1', id);
assert.strictEqual(verify('k1', t), id, 'valid token round-trips');
assert.strictEqual(verify('k2', t), null, 'other key rejects');
assert.strictEqual(verify('k1', t.slice(0, -1) + (t.endsWith('0') ? '1' : '0')), null, 'tampered sig rejects');
assert.strictEqual(verify('k1', sign('k1', 'fedcba9876543210').replace('fedcba9876543210', id)), null, 'swapped userId rejects');
assert.strictEqual(verify('k1', 'legacy-shared-token'), null, 'non-widget token rejects');
assert.strictEqual(verify('k1', undefined), null, 'missing token rejects');
console.log('test-widget-token: ok');
