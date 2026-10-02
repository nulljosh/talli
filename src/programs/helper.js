// Trusted helper: a revocable, read-only link for a caseworker, advocate or family
// member. The link carries a random token; only its SHA-256 is stored, so a leaked
// database cannot be turned back into working links. The view shows payment timing
// and application status and nothing else: no messages, vault, rent, SIN, BCeID or
// name. Removing the helper deletes the token index, so the link dies at once.
const crypto = require('crypto');
const { nextPaymentDate } = require('../pay-dates');

const TTL_DAYS = 90;
const MAX_HELPERS = 5;

const newToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const validToken = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
const cleanName = (raw) => String(raw ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
const pad = (n) => String(n).padStart(2, '0');
const day = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const expiryFrom = (now = new Date()) => { const d = new Date(now); d.setDate(d.getDate() + TTL_DAYS); return day(d); };
const isExpired = (expiresAt, now = new Date()) => !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt || '') || expiresAt < day(now);

const LABELS = {
  pwd: { applied: 'Applied', in_review: 'In review', medical_done: 'Medical report done', denied: 'Denied', resubmitted: 'Resubmitted', approved: 'Approved' },
  rdsp: { pending: 'Not started', dtc_required: 'Needs the DTC first', account_opened: 'Account opened', funded: 'Funded', active: 'Active', closed: 'Closed' },
  cdb: { pending: 'Not applied', applied: 'Applied', under_review: 'Under review', approved: 'Approved', rejected: 'Not approved', funded: 'Paying' },
};

// Everything here is chosen on purpose. Add a field only if a helper truly needs it.
function buildHelperView({ pwd, rdsp, cdb, income, reportMonths, expiresAt, now = new Date() }) {
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const label = (kind, status) => LABELS[kind][status] || LABELS[kind][Object.keys(LABELS[kind])[0]];
  return {
    readOnly: true,
    asOf: day(now),
    expiresAt,
    monthly: income && income.totalMonthly != null ? { pwd: income.pwdMonthly, cdb: income.cdbMonthly, total: income.totalMonthly } : null,
    nextPayment: nextPaymentDate(now),
    programs: [
      { id: 'pwd', name: 'PWD application', status: label('pwd', pwd?.status) },
      { id: 'rdsp', name: 'RDSP', status: label('rdsp', rdsp?.status) },
      { id: 'cdb', name: 'Canada Disability Benefit', status: label('cdb', cdb?.status) },
    ],
    report: { month, filed: !!reportMonths?.[month] },
  };
}

module.exports = { newToken, hashToken, validToken, cleanName, expiryFrom, isExpired, buildHelperView, TTL_DAYS, MAX_HELPERS };
