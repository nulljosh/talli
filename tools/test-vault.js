const assert = require('assert');
const V = require('../web/js/vault');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; }
}
const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
const iv = Uint8Array.from({ length: 12 }, (_, i) => 100 + i);
const text = new TextEncoder().encode('Talli vault test');

// Pinned vector. The Swift side (ios/Helpers/VaultCrypto.swift) must open exactly this.
const VECTOR_HEX = process.env.VAULT_VECTOR_PRINT ? null : require('./vault-vector.json').hex;

(async () => {
  const key = await V.deriveKey('correct horse battery staple', salt);

  await test('round trip', async () => {
    const sealed = await V.seal(key, text);
    assert.strictEqual(sealed[0], 1);
    assert.deepStrictEqual(Array.from(await V.open(key, sealed)), Array.from(text));
  });

  await test('two seals of the same bytes differ (fresh IV)', async () => {
    assert.notStrictEqual(V.hex(await V.seal(key, text)), V.hex(await V.seal(key, text)));
  });

  await test('wrong passphrase fails', async () => {
    const wrong = await V.deriveKey('correct horse battery stapler', salt);
    await assert.rejects(V.open(wrong, await V.seal(key, text)));
  });

  await test('a different salt gives a different key', async () => {
    const other = await V.deriveKey('correct horse battery staple', salt.map((x) => x + 1));
    await assert.rejects(V.open(other, await V.seal(key, text)));
  });

  await test('tampering is caught', async () => {
    const sealed = await V.seal(key, text);
    sealed[sealed.length - 1] ^= 1;
    await assert.rejects(V.open(key, sealed));
  });

  await test('not a vault file', async () => {
    await assert.rejects(V.open(key, new Uint8Array(40)), /Not a Talli vault file/);
  });

  await test('passphrase is NFC normalised, so accents match across platforms', async () => {
    const a = await V.deriveKey('café', salt);       // precomposed
    const b = await V.deriveKey('café', salt);      // combining accent
    assert.deepStrictEqual(Array.from(await V.open(b, await V.seal(a, text))), Array.from(text));
  });

  await test('JSON helpers', async () => {
    const v = { files: [{ id: 'abc', name: 'Decision letter.pdf' }] };
    assert.deepStrictEqual(await V.openJSON(key, await V.sealJSON(key, v)), v);
  });

  await test('pinned vector opens (what Swift must match)', async () => {
    if (!VECTOR_HEX) return;
    const sealed = Uint8Array.from(Buffer.from(VECTOR_HEX, 'hex'));
    assert.strictEqual(new TextDecoder().decode(await V.open(key, sealed)), 'Talli vault test');
  });

  if (process.env.VAULT_VECTOR_PRINT) {
    console.log('VECTOR ' + V.hex(await V.seal(key, text, iv)));
  }
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
