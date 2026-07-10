// One-time seed of Joshua's CGEB profile from the Jul 3, 2026 CRA notice.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/seed-cgeb.js
// Finds the user's blob prefix by locating the existing pwd-profile.json,
// so no ENCRYPTION_KEY/userId needed.

const { list, put } = require('@vercel/blob');

const CGEB = {
  status: 'active',
  noticeDate: '2026-07-03',
  baseYear: 2025,
  paymentPeriod: 'Jul 2026 - Jun 2027',
  annualEntitlement: 448.12,
  quarterlyAmount: 112.03,
  paymentSchedule: [
    { date: '2026-07-03', amount: 112.03 },
    { date: '2026-10-05', amount: 112.03 },
    { date: '2027-01-05', amount: 112.03 },
    { date: '2027-04-05', amount: 112.03 },
  ],
  notes: 'CRA notice Jul 3, 2026. Family net income $11,720, single, BC. Tax centre: Winnipeg MB R3C 3M2. First payment $112.03 deposited Jul 3, 2026.',
};

(async () => {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: 'talli-cache/', cursor });
    blobs.push(...r.blobs);
    cursor = r.cursor;
  } while (cursor);
  // Single-user install: any existing blob (e.g. results.json) marks the user's prefix.
  const anchor = blobs.find((b) => /\/(pwd|rdsp|cdb)-profile\.json$/.test(b.pathname)) || blobs.find((b) => b.pathname.endsWith('/results.json'));
  if (!anchor) {
    console.error('No *-profile.json anchor found. Paths seen:');
    console.error(blobs.map((b) => b.pathname).join('\n'));
    process.exit(1);
  }
  const prefix = anchor.pathname.replace(/\/[^/]+$/, '');
  const path = `${prefix}/cgeb-profile.json`;
  await put(path, JSON.stringify(CGEB), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
  console.log('Seeded', path);
})();
