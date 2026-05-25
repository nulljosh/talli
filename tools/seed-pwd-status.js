#!/usr/bin/env node
// One-time script: seed per-user PWD status to Vercel Blob.
// Usage: BLOB_READ_WRITE_TOKEN=xxx node tools/seed-pwd-status.js [username] [status]
// Defaults: joshuatrommel, denied
const crypto = require('crypto');
const { put } = require('@vercel/blob');

const BCEID_USERNAME = process.argv[2] || 'joshuatrommel';
const STATUS = process.argv[3] || 'denied';
const VALID = new Set(['applied','in_review','medical_done','denied','resubmitted','approved']);

if (!VALID.has(STATUS)) {
  console.error('Invalid status. Choose: applied|in_review|medical_done|denied|resubmitted|approved');
  process.exit(1);
}

const ENCRYPTION_KEY = process.env.SESSION_SECRET;
if (!ENCRYPTION_KEY) {
  console.error('SESSION_SECRET env var required to derive userId');
  process.exit(1);
}

function deriveUserId(username) {
  return crypto.createHash('sha256').update(username).digest('hex').slice(0, 16);
}

function blobPrefix(userId) {
  const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(userId).digest('hex').slice(0, 12);
  return `tally-cache/${hmac}-${userId}`;
}

async function main() {
  const userId = deriveUserId(BCEID_USERNAME);
  const blobPath = `${blobPrefix(userId)}/pwd-profile.json`;
  const data = {
    status: STATUS,
    submittedDate: '2026-01-14',
    deniedDate: STATUS === 'denied' ? '2026-05-14' : null,
    notes: STATUS === 'denied' ? 'Late autism diagnosis. Ministry denied May 2026. Extension granted 2026-05-25. Hard deadline 2026-06-18. Fax 1-855-771-8784 or MYSS.' : '',
  };
  console.log(`Seeding ${BCEID_USERNAME} (userId: ${userId})`);
  console.log('Path:', blobPath);
  console.log('Data:', JSON.stringify(data, null, 2));
  await put(blobPath, JSON.stringify(data), { access: 'public', addRandomSuffix: false });
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
