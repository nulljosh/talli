const { CHEQUE_ISSUE_DATES } = require('../pay-dates');
// Generic schema for per-user benefit/disability program profiles.
// Each entry fully describes a program's profile endpoint (route, valid
// statuses, default shape) so new programs can be added as data only --
// see registerProfileRoutes() in src/api.js for the route factory.

const PROFILE_PROGRAMS = [
  {
    id: 'pwd',
    route: 'pwd-profile',
    logTag: 'PWD',
    name: 'BC Disability Assistance (PWD)',
    jurisdiction: 'BC',
    validStatuses: ['applied', 'in_review', 'medical_done', 'denied', 'resubmitted', 'approved'],
    defaults: { status: 'applied', submittedDate: null, deniedDate: null, monthlyAmount: null, notes: '' },
  },
  {
    id: 'rdsp',
    route: 'rdsp-profile',
    logTag: 'RDSP',
    name: 'Registered Disability Savings Plan (RDSP)',
    jurisdiction: 'CA-federal',
    validStatuses: ['pending', 'dtc_required', 'account_opened', 'funded', 'active', 'closed'],
    defaults: { status: 'pending', accountOpenedDate: null, accountNumber: null, notes: '', birthYear: null, dtcYear: null, band: null, entries: [] },
  },
  {
    id: 'cdb',
    route: 'cdb-profile',
    logTag: 'CDB',
    name: 'Canada Disability Benefit (CDB)',
    jurisdiction: 'CA-federal',
    validStatuses: ['pending', 'applied', 'under_review', 'approved', 'rejected', 'funded'],
    defaults: { status: 'pending', appliedDate: null, approvalDate: null, monthlyAmount: null, retroactiveEligible: false, notes: '' },
  },
  {
    id: 'dtc',
    route: 'dtc-profile',
    logTag: 'DTC',
    name: 'Disability Tax Credit (DTC)',
    jurisdiction: 'CA-federal',
    validStatuses: ['not_applied', 'applied', 'in_review', 'approved', 'denied'],
    defaults: { status: 'not_applied', approvedDate: null, retroactiveYearsFiled: [], notes: '' },
  },
  {
    id: 'debt_payoff',
    route: 'debt-payoff-profile',
    logTag: 'DEBT',
    name: 'Debt Payoff Plan',
    jurisdiction: 'personal',
    validStatuses: ['active', 'paused', 'complete'],
    defaults: { status: 'active', totalDebt: 0, paidToDate: 0, monthlyPayment: 0, targetDate: null, notes: '' },
  },
  {
    id: 'other_benefits',
    route: 'other-benefits-profile',
    logTag: 'BENEFITS',
    name: 'Other Benefits to Look Into',
    jurisdiction: 'mixed',
    validStatuses: ['tracking'],
    defaults: {
      status: 'tracking',
      checked: {
        rdsp_grants: false,
        dtc_retro_refund: false,
        dtc_transfer: false,
        fair_pharmacare: false,
        bc_bus_pass: false,
        cpp_d: false,
        cwb_disability: false,
        clbc: false,
      },
      notes: '',
    },
  },
  {
    id: 'cgeb',
    route: 'cgeb-profile',
    logTag: 'CGEB',
    name: 'Canada Groceries and Essentials Benefit (CGEB)',
    jurisdiction: 'CA-federal',
    validStatuses: ['pending', 'active', 'adjusted', 'stopped'],
    defaults: { status: 'pending', noticeDate: null, baseYear: null, paymentPeriod: null, annualEntitlement: null, quarterlyAmount: null, paymentSchedule: [], notes: '' },
  },
  {
    id: 'earnings',
    route: 'earnings-profile',
    logTag: 'EARNINGS',
    name: 'Work Earnings',
    jurisdiction: 'BC',
    validStatuses: ['tracking'],
    defaults: { status: 'tracking', entries: [], notes: '' },
  },
  {
    id: 'assets',
    route: 'assets-profile',
    logTag: 'ASSETS',
    name: 'Assets',
    jurisdiction: 'BC',
    validStatuses: ['tracking'],
    defaults: { status: 'tracking', accounts: [], notes: '' },
  },
];

// Current monthly rates, used only when the user has not recorded a real amount.
// BC PWD single-person support+shelter, and the federal CDB maximum.
const DEFAULT_MONTHLY_RATES = { pwd: 1450, cdb: 200 };

// Single source of truth for "what does this person actually receive per month".
// Everything that shows income -- the web dashboard, /api/mobile for the native
// apps, and the payment-amount fallback -- derives from here, so the platforms
// cannot drift apart the way they did before 2026-08-19.
// Uses ?? not ||, so a genuine recorded 0 is preserved rather than replaced.
// Year figures count BC's published cheque issue dates in this calendar year, so
// they are what actually lands in the account, not 12 x monthly. If BC hasn't
// published the year yet the count is short; refresh CHEQUE_ISSUE_DATES.
// portalPwd is the amount My Self Serve says BC is actually paying; it beats the
// default rate but not a figure the user recorded themselves.
const sum = (list) => Math.round(list.reduce((a, p) => a + p.amount, 0) * 100) / 100;
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function creditSchedule(cgebProfile, year) {
  const quarterly = cgebProfile?.quarterlyAmount ?? 0;
  const schedule = cgebProfile?.paymentSchedule?.length
    ? cgebProfile.paymentSchedule.map((p) => ({ date: p.date ?? p, amount: p.amount ?? quarterly }))
    : quarterly ? ['01', '04', '07', '10'].map((m) => ({ date: `${year}-${m}-05`, amount: quarterly })) : [];
  return schedule.filter((p) => String(p.date).startsWith(String(year)));
}

function deriveIncome(pwdProfile, cdbProfile, now = new Date(), cgebProfile = null, portalPwd = null) {
  const pwdMonthly = pwdProfile?.monthlyAmount ?? portalPwd ?? DEFAULT_MONTHLY_RATES.pwd;
  const cdbMonthly = cdbProfile?.monthlyAmount ?? DEFAULT_MONTHLY_RATES.cdb;
  const totalMonthly = pwdMonthly + cdbMonthly;
  const year = String(now.getFullYear());
  const today = isoDay(now);
  const thisYear = CHEQUE_ISSUE_DATES.filter((d) => d.startsWith(year));
  const left = thisYear.filter((d) => d >= today).length;
  // GST/HST credit (CGEB): only when the user recorded a quarterly amount. CRA
  // pays the 5th of Jan/Apr/Jul/Oct unless the profile lists its own schedule.
  // Schedule entries are {date, amount} (or bare dates); the recorded schedule
  // wins, since a benefit can start mid-year.
  const credits = creditSchedule(cgebProfile, year);
  const yearCredits = sum(credits);
  const creditsLeft = sum(credits.filter((p) => p.date >= today));
  return {
    pwdMonthly, cdbMonthly, totalMonthly,
    yearTotal: totalMonthly * thisYear.length + yearCredits,
    yearRemaining: totalMonthly * left + creditsLeft,
    paymentsLeft: left,
    yearCredits,
  };
}

// Year in review: every payment, credit and logged earning for one calendar year,
// for tax time. In January it reviews the year that just ended; otherwise the
// year so far. Only dates already passed count, so it is what actually landed.
function deriveYearReview({ pwd, cdb, cgeb, earnings, portalPwd = null }, now = new Date()) {
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const today = isoDay(now);
  const income = deriveIncome(pwd, cdb, new Date(year, 6, 1), cgeb, portalPwd);
  const landed = (d) => String(d).startsWith(String(year)) && d < today;
  const benefits = CHEQUE_ISSUE_DATES.filter(landed).flatMap((date) => [
    { date, what: 'PWD assistance', amount: income.pwdMonthly },
    { date, what: 'Canada Disability Benefit', amount: income.cdbMonthly },
  ]).filter((p) => p.amount);
  const credits = creditSchedule(cgeb, year).filter((p) => landed(p.date)).map((p) => ({ ...p, what: 'GST/HST credit' }));
  const work = (earnings?.entries || []).filter((e) => landed(e.date))
    .map((e) => ({ date: e.date, what: 'Work earnings', amount: Number(e.amount) || 0 }));
  const items = [...benefits, ...credits, ...work].sort((a, b) => a.date.localeCompare(b.date));
  return {
    year,
    complete: year < now.getFullYear(),
    items,
    totals: { benefits: sum(benefits), credits: sum(credits), earnings: sum(work), all: sum(items) },
  };
}

// BC's annual earnings exemption for a single person with PWD: earn up to this
// in a calendar year and assistance doesn't change. Past it, clawback starts.
// Add each year when BC posts it (gov.bc.ca "Annual earnings exemption").
const EARNINGS_EXEMPTION = { 2026: 16200 };

// Entries are {date: 'YYYY-MM-DD', amount}. Null exemption = year not posted yet.
function deriveEarnings(earningsProfile, now = new Date()) {
  const year = now.getFullYear();
  const earned = Math.round((earningsProfile?.entries || [])
    .filter((e) => String(e.date).startsWith(String(year)))
    .reduce((a, e) => a + (Number(e.amount) || 0), 0) * 100) / 100;
  const exemption = EARNINGS_EXEMPTION[year] ?? null;
  return { year, earned, exemption, left: exemption == null ? null : Math.max(0, exemption - earned), over: exemption != null && earned > exemption };
}

// BC PWD single person asset limit; RDSP and exempt accounts don't count.
const ASSET_LIMIT = 100000;

// Accounts are {name, balance, exempt}. Exempt true for RDSP and other exempt accounts.
function deriveAssets(assetsProfile) {
  const accounts = assetsProfile?.accounts || [];
  const counted = Math.round(accounts
    .filter((a) => !a.exempt)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0) * 100) / 100;
  const exempt = Math.round(accounts
    .filter((a) => a.exempt)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0) * 100) / 100;
  const left = Math.max(0, ASSET_LIMIT - counted);
  return { counted, exempt, limit: ASSET_LIMIT, left, over: counted > ASSET_LIMIT };
}

module.exports = { PROFILE_PROGRAMS, DEFAULT_MONTHLY_RATES, deriveIncome, deriveYearReview, deriveEarnings, EARNINGS_EXEMPTION, ASSET_LIMIT, deriveAssets };
