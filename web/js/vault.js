// Talli document vault crypto. Runs in the browser and in Node (tests).
// Format v1: byte 1, then a 12 byte IV, then AES-256-GCM ciphertext+tag.
// The key comes from PBKDF2-HMAC-SHA256 over the passphrase (NFC, UTF-8) and a
// per-vault salt. The passphrase and key never leave the device; the server
// stores ciphertext and the salt only. iOS and macOS (CryptoKit) use the same format.
(function (root) {
  const ITERATIONS = 600000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const subtle = () => root.crypto.subtle;

  const b64 = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  const randomBytes = (n) => root.crypto.getRandomValues(new Uint8Array(n));
  const hex = (bytes) => Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');

  async function deriveKey(passphrase, salt) {
    const base = await subtle().importKey('raw', enc.encode(String(passphrase).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  // iv is injectable only so tests can pin a vector; real calls leave it out.
  async function seal(key, bytes, iv = randomBytes(12)) {
    const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes));
    const out = new Uint8Array(1 + 12 + ct.length);
    out[0] = 1; out.set(iv, 1); out.set(ct, 13);
    return out;
  }

  // Throws on a wrong key or any tampering: GCM authenticates the whole message.
  async function open(key, bytes) {
    if (bytes.length < 29 || bytes[0] !== 1) throw new Error('Not a Talli vault file');
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: bytes.subarray(1, 13) }, key, bytes.subarray(13)));
  }

  const sealJSON = (key, value) => seal(key, enc.encode(JSON.stringify(value)));
  const openJSON = async (key, bytes) => JSON.parse(dec.decode(await open(key, bytes)));

  const api = { ITERATIONS, b64, unb64, hex, randomBytes, deriveKey, seal, open, sealJSON, openJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Vault = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
