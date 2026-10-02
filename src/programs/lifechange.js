// Big changes: turning 65 and moving out of BC. Dates and the plain steps, so
// nothing stops by surprise. Rules (checked 2026-10-02): BC disability assistance
// is for BC residents and most people move to OAS, GIS and CPP at 65; you can
// apply for OAS from the month after you turn 64; BC top-ups and keeps health
// supplements for people leaving PWD at 65 while income stays low; MSP covers the
// rest of the month you leave plus two months; the Canada Disability Benefit is
// for ages 18 to 64. Sources: gov.bc.ca "Leaving disability assistance" and
// "Supports for seniors", Disability Alliance BC help sheet 12B.

const pad = (n) => String(n).padStart(2, '0');
const ym = (y, m) => `${y}-${pad(m)}`;               // m is 1-12
const monthIndex = (y, m) => y * 12 + (m - 1);
const fromIndex = (i) => ym(Math.floor(i / 12), (i % 12) + 1);
const monthName = (key) => new Date(`${key}-01T12:00:00`).toLocaleString('en-CA', { month: 'long', year: 'numeric' });
const lastDayOf = (y, m) => new Date(y, m, 0).getDate();   // m is 1-12
const isoDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function cleanLife(raw, now = new Date()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const y = Math.trunc(Number(r.birthYear)), m = Math.trunc(Number(r.birthMonth));
  const ok = y >= 1900 && y <= now.getFullYear() && m >= 1 && m <= 12;
  const leave = /^\d{4}-\d{2}-\d{2}$/.test(r.leaveDate || '') && !Number.isNaN(new Date(`${r.leaveDate}T12:00:00`).getTime()) ? r.leaveDate : null;
  return { birthYear: ok ? y : null, birthMonth: ok ? m : null, leaveDate: leave };
}

function turning65(life, now) {
  if (!life.birthYear) return null;
  const turns = ym(life.birthYear + 65, life.birthMonth);
  const away = monthIndex(life.birthYear + 65, life.birthMonth) - monthIndex(now.getFullYear(), now.getMonth() + 1);
  const applyFrom = fromIndex(monthIndex(life.birthYear + 65, life.birthMonth) - 11);
  const applyBy = fromIndex(monthIndex(life.birthYear + 65, life.birthMonth) - 6);
  const stage = away <= 0 ? 'now' : away <= 6 ? 'apply' : away <= 11 ? 'open' : away <= 24 ? 'prepare' : 'far';
  return {
    turns, monthsAway: away, stage, applyFrom, applyBy,
    headline: away <= 0 ? 'You are 65 or older' : away === 1 ? 'You turn 65 next month' : `You turn 65 in ${monthName(turns)}`,
    timeline: [
      { when: applyFrom, what: 'You can apply for Old Age Security and the Guaranteed Income Supplement', detail: 'From the month after you turn 64. Applying early gives you a smooth hand-off.' },
      { when: applyBy, what: 'Aim to have both applications in', detail: 'Service Canada needs time. File your taxes every year, because the Guaranteed Income Supplement depends on them.' },
      { when: turns, what: 'Your PWD payments move to OAS, GIS and CPP', detail: 'CPP disability turns into CPP retirement on its own. The Canada Disability Benefit stops, because it is for ages 18 to 64.' },
    ],
    steps: [
      'Apply for OAS and the Guaranteed Income Supplement through Service Canada. Online is fastest.',
      'Tell the ministry you applied and ask what your top-up will be if the federal amounts are less than your PWD cheque.',
      'Ask the ministry to keep your health and transportation supplements. People leaving PWD at 65 can keep them while their income stays low.',
      'File your taxes on time every year. A late return can hold the Guaranteed Income Supplement.',
      'Keep the Disability Tax Credit. It still counts after 65.',
    ],
    say: `I will turn 65 in ${monthName(turns)}. What do I need to do so my payments do not stop? Can you confirm what my top-up will be, and that I keep my health and transportation supplements?`,
    phone: '1-800-277-9914',
    links: [
      { label: 'Leaving disability assistance (BC)', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/services-for-people-with-disabilities/disability-assistance/leaving-disability-assistance' },
      { label: 'Old Age Security (Canada)', url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security.html' },
    ],
  };
}

function leavingBC(life) {
  const leave = life.leaveDate;
  let mspEnds = null;
  if (leave) {
    const [y, m] = leave.split('-').map(Number);
    const i = monthIndex(y, m) + 2;
    const endKey = fromIndex(i);
    const [ey, em] = endKey.split('-').map(Number);
    mspEnds = isoDay(ey, em, lastDayOf(ey, em));
  }
  return {
    leaveDate: leave, mspEnds,
    steps: [
      'Tell the ministry before you go. BC disability assistance is only for people who live in BC, so it stops when you move for good.',
      'Apply in your new province right away. Assistance does not transfer: Alberta has AISH and Ontario has ODSP, and each has its own application.',
      'Tell Health Insurance BC before you leave (the Permanent Move Outside BC form).' + (mspEnds ? ` Your BC medical coverage runs to ${mspEnds}.` : ' BC medical coverage runs for the rest of the month you leave plus two more months.'),
      'Apply to your new province health plan the day you arrive, so there is no gap.',
      'Change your address with the CRA and Service Canada. The Canada Disability Benefit, CPP disability, the Disability Tax Credit, your RDSP and the GST credit follow you.',
      'The BC bus pass and Fair PharmaCare end when you leave.',
    ],
    say: `I am moving out of British Columbia${leave ? ` on ${leave}` : ''}. What happens to my payments and my supplements, and what do I need to hand in before I go?`,
    phone: '1-866-866-0800',
    links: [
      { label: 'Leaving disability assistance (BC)', url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/services-for-people-with-disabilities/disability-assistance/leaving-disability-assistance' },
      { label: 'Medical Services Plan when you move', url: 'https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/managing-your-msp-account/leaving-bc-temporarily' },
    ],
  };
}

function deriveLife(raw, now = new Date()) {
  const life = cleanLife(raw, now);
  return { life, turning65: turning65(life, now), leaving: leavingBC(life) };
}

module.exports = { deriveLife, cleanLife };
