// Reconsideration helper. A denied PWD decision can be challenged: ask the
// ministry to reconsider within 20 business days of getting the letter (form
// HR0021), they answer within 10, and an appeal to the Employment and
// Assistance Appeal Tribunal must start within 7 business days of that answer.
// Business days skip weekends and BC statutory holidays; day 1 is the day after
// the letter arrived. Sources: gov.bc.ca appeals guide, Disability Alliance BC
// help sheets 5A and 5B (checked 2026-10-02).

const REQUEST_DAYS = 20;
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (isoDate) => new Date(`${isoDate}T12:00:00`);

// nth weekday (1 = Monday ... 7 = Sunday) of a month, month 0 based
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month, 1, 12);
  const shift = (weekday - (first.getDay() || 7) + 7) % 7;
  return new Date(year, month, 1 + shift + (n - 1) * 7, 12);
}

// Anonymous Gregorian computus
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function bcHolidays(year) {
  const goodFriday = easter(year); goodFriday.setDate(goodFriday.getDate() - 2);
  const victoria = new Date(year, 4, 24, 12); // Monday on or before May 24
  victoria.setDate(victoria.getDate() - ((victoria.getDay() + 6) % 7));
  return new Set([
    `${year}-01-01`, iso(nthWeekday(year, 1, 1, 3)), iso(goodFriday), iso(victoria), `${year}-07-01`,
    iso(nthWeekday(year, 7, 1, 1)), iso(nthWeekday(year, 8, 1, 1)), `${year}-09-30`,
    iso(nthWeekday(year, 9, 1, 2)), `${year}-11-11`, `${year}-12-25`,
  ]);
}

const holidayCache = new Map();
function isBusinessDay(d) {
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const y = d.getFullYear();
  if (!holidayCache.has(y)) holidayCache.set(y, bcHolidays(y));
  return !holidayCache.get(y).has(iso(d));
}

// The date that is n business days after `start` (day 1 is the next business day).
function addBusinessDays(startIso, n) {
  const d = at(startIso);
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); if (isBusinessDay(d)) left--; }
  return iso(d);
}

// Business days in (fromIso, toIso]
function businessDaysBetween(fromIso, toIso) {
  const d = at(fromIso); const end = at(toIso);
  let n = 0;
  while (d < end) { d.setDate(d.getDate() + 1); if (isBusinessDay(d)) n++; }
  return n;
}

const longDate = (isoDate) => at(isoDate).toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
const valid = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(at(s).getTime());

function draftLetter(received) {
  return `Request for Reconsideration

To: Ministry of Social Development and Poverty Reduction
Date: [today's date]
My name: [your full name]
My file or client number: [from your letter]

I am asking you to reconsider the decision on my Persons with Disabilities application. I received the decision letter on ${longDate(received)}.

I disagree with the decision because:

1. My impairment. [Name your diagnoses. Say how they affect you. Attach your doctor's report.]

2. How long it lasts. [Say how long you have had this and why it will continue for at least two years.]

3. My daily life. [Give real examples from your worst days: washing, dressing, cooking, shopping, getting around, managing money and medicine, using a phone. Say which ones you cannot do, or only with great difficulty, or very slowly.]

4. The help I need. [Say who helps you, what equipment you use, and what happens when that help is not there.]

New information I am attaching:
- [Letter from my doctor or nurse practitioner, dated ...]
- [Anything else: a support worker's letter, test results, a friend or family statement]

I am asking you to approve my application. Please contact me at [phone] if you need more information.

[Your signature]`;
}

function deriveReconsideration(raw, now = new Date()) {
  const received = raw?.received;
  if (!valid(received)) return null;
  const today = iso(now);
  const deadline = addBusinessDays(received, REQUEST_DAYS);
  const left = today > deadline ? 0 : businessDaysBetween(today, deadline);
  const status = today > deadline ? 'passed' : left === 0 ? 'today' : left <= 5 ? 'soon' : 'open';
  return {
    received, deadline, left, status,
    steps: [
      'Read your denial letter. Note which of the four tests it says you did not meet.',
      'Get the Request for Reconsideration form (HR0021) from a ministry office or My Self Serve.',
      'Ask your doctor or nurse practitioner for a new letter that answers those exact points.',
      'Write your own statement. The draft below gives you the shape.',
      `Hand it in, fax it or send it through My Self Serve before ${longDate(deadline)}. Keep the proof that you sent it.`,
      'The ministry must answer in writing within 10 business days.',
      'If the answer is no, you can appeal to the Employment and Assistance Appeal Tribunal. You have 7 business days from that letter to tell them.',
      'Free help: Disability Alliance BC, 1-800-663-1278. Many people win on the second try.',
    ],
    draft: draftLetter(received),
    note: 'Talli counts weekends and BC holidays. If your deadline is close to a holiday, hand it in earlier.',
    links: [
      { label: 'Ministry guide to reconsideration and appeals', url: 'https://www2.gov.bc.ca/assets/gov/british-columbians-our-governments/organizational-structure/ministries-organizations/social-development-poverty-reduction/appeals.pdf' },
      { label: 'Appeals policy', url: 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/decisions-reconsideration-and-appeal/appeal' },
    ],
    phone: '1-800-663-1278',
  };
}

module.exports = { deriveReconsideration, addBusinessDays, businessDaysBetween, bcHolidays, REQUEST_DAYS };
