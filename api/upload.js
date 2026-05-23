const { put } = require('@vercel/blob');
const crypto = require('crypto');

function blobPrefix(userId) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET must be set');
  const hmac = crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 12);
  return `tally-cache/${hmac}-${userId}`;
}

module.exports = async function handler(req, res) {
  // Security: require secret token
  const authHeader = req.headers.authorization;
  const expected = process.env.UPLOAD_SECRET;
  const expectedFull = `Bearer ${expected}`;
  if (!expected || !authHeader || authHeader.length !== expectedFull.length || !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedFull))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data } = req.body;
  const userId = req.headers['x-user-id'];

  if (!data) {
    return res.status(400).json({ error: 'Missing data' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Missing userId' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    const blob = await put(`${blobPrefix(userId)}/results.json`, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });

    res.status(200).json({
      success: true,
      blobUrl: blob.url,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};
