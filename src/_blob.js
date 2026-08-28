// Replacement for @vercel/blob, backed by Workers KV.
//
// Ported from epiphany/server/api/_blob.js and narrowed to the four things
// talli actually does: read a JSON doc, write a JSON doc, write an SVG, delete.
// The @vercel/blob list()+fetch(url) dance is gone -- inside a Worker, fetching
// our own /api/blob/<key> URL would be a subrequest loop, so reads go straight
// to KV and only the browser ever resolves a blob URL.
//
// ponytail: KV, not R2, because R2 needs a dashboard click. Values here are
// cached JSON and <100KB SVGs, far under KV's 25MB/value cap.

const PREFIX = 'blob:';

// Resolved per call: the Workers env proxy only yields bindings inside a
// request scope, so caching this at module load would capture undefined.
function kv() {
  const ns = globalThis.__cfEnv?.BLOB;
  if (!ns) throw new Error('BLOB KV binding unavailable');
  return ns;
}

function available() {
  return !!globalThis.__cfEnv?.BLOB;
}

// Accepts a bare key or a previously-issued /api/blob/<key> URL.
function urlToKey(urlOrKey) {
  if (!urlOrKey) return '';
  const s = String(urlOrKey);
  const i = s.indexOf('/api/blob/');
  if (i === -1) return s.replace(/^\/+/, '');
  return decodeURIComponent(s.slice(i + '/api/blob/'.length));
}

// Relative on purpose: the client is always same-origin, so this survives the
// workers.dev -> custom-domain cutover without a rewrite.
function keyToUrl(key) {
  return `/api/blob/${key}`;
}

async function getJSON(key) {
  const raw = await kv().get(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function putJSON(key, data) {
  await kv().put(PREFIX + key, JSON.stringify(data), {
    metadata: { contentType: 'application/json', uploadedAt: new Date().toISOString() },
  });
  return keyToUrl(key);
}

async function putBytes(key, bytes, contentType) {
  await kv().put(PREFIX + key, bytes, {
    metadata: { contentType, uploadedAt: new Date().toISOString() },
  });
  return keyToUrl(key);
}

// Returns { body, contentType } or null. Used by the /api/blob/:key route.
async function getWithMeta(key) {
  const { value, metadata } = await kv().getWithMetadata(PREFIX + key, 'arrayBuffer');
  if (!value) return null;
  return { body: Buffer.from(value), contentType: metadata?.contentType || 'application/octet-stream' };
}

async function del(urlOrKey) {
  const key = urlToKey(urlOrKey);
  if (key) await kv().delete(PREFIX + key);
}

module.exports = { available, keyToUrl, urlToKey, getJSON, putJSON, putBytes, getWithMeta, del };
