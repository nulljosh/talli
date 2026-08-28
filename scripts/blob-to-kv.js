#!/usr/bin/env node
// One-off: copy everything out of Vercel Blob into the Workers KV namespace that
// src/_blob.js reads, so the DNS cutover does not reset the dashboard to
// defaults (pwd-profile, report-status, cdb/rdsp/cgeb profiles and the cached
// scrape all live in Blob today).
//
//   BLOB_READ_WRITE_TOKEN=... node scripts/blob-to-kv.js          # dry run
//   BLOB_READ_WRITE_TOKEN=... node scripts/blob-to-kv.js --write  # actually put
//
// Writes a wrangler bulk file and shells out once, rather than one KV round
// trip per key. Safe to re-run: KV puts are idempotent overwrites.
//
// ponytail: throwaway. Delete it once the cutover is done and verified.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const WRITE = process.argv.includes('--write');
const OUT = path.join(__dirname, '../.kv-bulk.json');

if (!TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is required (npx vercel env pull to fetch it)');
  process.exit(1);
}

async function listAll() {
  const blobs = [];
  let cursor;
  do {
    const url = new URL('https://blob.vercel-storage.com/');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    blobs.push(...(page.blobs || []));
    cursor = page.hasMore ? page.cursor : null;
  } while (cursor);
  return blobs;
}

(async () => {
  const blobs = await listAll();
  console.log(`Found ${blobs.length} blobs`);

  const entries = [];
  for (const b of blobs) {
    const res = await fetch(b.downloadUrl || b.url);
    if (!res.ok) {
      console.warn(`  SKIP ${b.pathname} (download ${res.status})`);
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    // Must match src/_blob.js: "blob:" prefix, contentType in metadata.
    entries.push({
      key: `blob:${b.pathname}`,
      value: bytes.toString('base64'),
      base64: true,
      metadata: {
        contentType: b.contentType || 'application/json',
        uploadedAt: b.uploadedAt || new Date().toISOString(),
      },
    });
    console.log(`  ${b.pathname} (${bytes.length} bytes)`);
  }

  fs.writeFileSync(OUT, JSON.stringify(entries));
  console.log(`\nWrote ${entries.length} entries to ${OUT}`);

  if (!WRITE) {
    console.log('Dry run. Re-run with --write to push them into KV.');
    return;
  }

  execFileSync('npx', ['wrangler', 'kv', 'bulk', 'put', OUT, '--binding', 'BLOB', '--remote'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  fs.unlinkSync(OUT);
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
