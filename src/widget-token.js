// Widget token: a signed userId the app hands its widgets through the App
// Group, since widgets can't share the session cookie.
// ponytail: no expiry; rotating SESSION_SECRET revokes every token at once.
const crypto = require('crypto');

function sign(key, userId) {
  const sig = crypto.createHmac('sha256', key).update(`widget:${userId}`).digest('hex').slice(0, 32);
  return `w1.${userId}.${sig}`;
}

// Returns the userId for a valid token, otherwise null.
function verify(key, token) {
  const m = /^w1\.([0-9a-f]{16})\.([0-9a-f]{32})$/.exec(token || '');
  if (!m) return null;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sign(key, m[1]))) ? m[1] : null;
}

module.exports = { sign, verify };
