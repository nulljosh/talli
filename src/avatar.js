'use strict';
// Everyone gets a civil servant: 24 flat illustrations (clerks, case workers, call centre agents) drawn by
// scripts/gen_avatars.py, so no photo licence and no real face. Same user, same face; regenerate steps to the next one.

const FILES = [
  '01-intake-clerk.png',
  '02-case-worker.png',
  '03-benefits-officer.png',
  '04-records-clerk.png',
  '05-call-centre.png',
  '06-tax-assessor.png',
  '07-front-counter.png',
  '08-supervisor.png',
  '09-eligibility-worker.png',
  '10-file-room.png',
  '11-notary.png',
  '12-policy-analyst.png',
  '13-intake-clerk.png',
  '14-case-worker.png',
  '15-benefits-officer.png',
  '16-records-clerk.png',
  '17-call-centre.png',
  '18-tax-assessor.png',
  '19-front-counter.png',
  '20-supervisor.png',
  '21-eligibility-worker.png',
  '22-file-room.png',
  '23-notary.png',
  '24-policy-analyst.png'
];

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// `n` is bumped each time they tap regenerate; consecutive picks are different statues.
const avatarFor = (userId, n = 0) => `/avatars/${FILES[(hash(userId) + n) % FILES.length]}`;

module.exports = { avatarFor, FILES };
