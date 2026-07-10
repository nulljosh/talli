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
  const { blobs } = await list({ prefix: 'talli-cache/' });
  const anchor = blobs.find((b) => b.pathname.endsWith('/pwd-profile.json'));
  if (!anchor) throw new Error('No pwd-profile.json found under talli-cache/');
  const prefix = anchor.pathname.replace(/\/pwd-profile\.json$/, '');
  const path = `${prefix}/cgeb-profile.json`;
  await put(path, JSON.stringify(CGEB), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
  console.log('Seeded', path);
})();
