// Reviewer demo account. App Review cannot hold a real BCeID, so one fixed
// username signs in without touching BC Self-Serve and sees invented data.
// Off unless DEMO_PASSWORD is set as a Worker secret, so no secret is in the repo.
const crypto = require('crypto');

const DEMO_USERNAME = 'talli.review';

function isDemoLogin(username, password) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected || username !== DEMO_USERNAME || typeof password !== 'string') return false;
  const a = crypto.createHash('sha256').update(password).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Same shape the scraper returns, dated relative to today so it never looks stale.
function demoResults(now = new Date()) {
  const line = (daysAgo) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    return `${d.getFullYear()} / ${MONTHS[d.getMonth()]} / ${String(d.getDate()).padStart(2, '0')}`;
  };
  return {
    success: true,
    checkedAt: now.toISOString(),
    sections: {
      'Payment Info': { allText: ['Monthly amount $1,060.00'], tableData: [] },
      Messages: {
        allText: [
          line(1), 'Your monthly report has been received.',
          line(9), 'Reminder: update your address if you have moved.',
          line(21), 'Your payment has been issued.',
        ],
      },
      Notifications: { allText: [] },
    },
  };
}

module.exports = { DEMO_USERNAME, isDemoLogin, demoResults };
