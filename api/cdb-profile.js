const crypto = require('crypto');

const IS_PRODUCTION = !!process.env.VERCEL;
const ENCRYPTION_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const blobPrefixCache = new Map();

function blobPrefix(userId) {
  let cached = blobPrefixCache.get(userId);
  if (cached) return cached;
  const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(userId).digest('hex').slice(0, 12);
  cached = `talli-cache/${hmac}-${userId}`;
  blobPrefixCache.set(userId, cached);
  return cached;
}

async function loadUserBlob(userId, key, fallback) {
  if (!IS_PRODUCTION || !userId) return fallback;
  try {
    const { list } = require('@vercel/blob');
    const blobPath = `${blobPrefix(userId)}/${key}.json`;
    const { blobs } = await list({ prefix: blobPath });
    const match = blobs?.find(b => b.pathname === blobPath);
    if (match) {
      const resp = await fetch(match.url);
      return await resp.json();
    }
    const legacyPath = `talli-cache/${userId}/${key}.json`;
    const { blobs: legacyBlobs } = await list({ prefix: legacyPath });
    const legacyMatch = legacyBlobs?.find(b => b.pathname === legacyPath);
    if (legacyMatch) {
      const resp = await fetch(legacyMatch.url);
      const data = await resp.json();
      saveUserBlob(userId, key, data).catch(() => {});
      return data;
    }
  } catch (err) {
    console.error('[BLOB] Read', key, 'failed:', err.message);
  }
  return fallback;
}

async function saveUserBlob(userId, key, data) {
  if (!IS_PRODUCTION || !userId) return;
  try {
    const { put } = require('@vercel/blob');
    await put(`${blobPrefix(userId)}/${key}.json`, JSON.stringify(data), { access: 'public', addRandomSuffix: false });
  } catch (err) {
    console.error('[BLOB] Write', key, 'failed:', err.message);
  }
}

const VALID_CDB_STATUSES = new Set(['pending','applied','under_review','approved','rejected','funded']);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    try {
      const data = await loadUserBlob(userId, 'cdb-profile', { status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: null, retroactiveEligible: false, notes: '' });
      return res.status(200).json(data);
    } catch (err) {
      console.error('[CDB] GET error:', err.message);
      return res.status(200).json({ status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: null, retroactiveEligible: false, notes: '' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { status, appliedDate, approvalDate, monthlyAmount, retroactiveEligible, notes } = req.body || {};
      if (status && !VALID_CDB_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const existing = await loadUserBlob(userId, 'cdb-profile', { status: 'pending' });
      const data = {
        ...existing,
        ...(status !== undefined && { status }),
        ...(appliedDate !== undefined && { appliedDate }),
        ...(approvalDate !== undefined && { approvalDate }),
        ...(monthlyAmount !== undefined && { monthlyAmount }),
        ...(retroactiveEligible !== undefined && { retroactiveEligible }),
        ...(notes !== undefined && { notes }),
      };
      await saveUserBlob(userId, 'cdb-profile', data);
      return res.status(200).json(data);
    } catch (err) {
      console.error('[CDB] POST error:', err.message);
      return res.status(500).json({ error: 'Failed to save CDB profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
