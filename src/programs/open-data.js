// Open data: the pay-date and rate tables Talli runs on, published as plain JSON that
// any advocate, caseworker or developer can use. Built from the same modules the app
// uses, so it can never disagree with the app. Every figure carries its source.
const { CHEQUE_ISSUE_DATES } = require('../pay-dates');
const { SUPPORT, SHELTER } = require('./household');
const { EARNINGS_EXEMPTION } = require('./profiles');
const { CATALOG } = require('./supplements');
const { LIMITS, ENTITLEMENT } = require('./rdsp');
const { listProvinces } = require('./provinces');

const SOURCES = {
  bcRates: 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/bc-employment-and-assistance-rate-tables/disability-assistance-rate-table',
  bcPayDates: 'https://www2.gov.bc.ca/gov/content/family-social-supports/income-assistance/payment-dates',
  bcEarnings: 'https://www2.gov.bc.ca/gov/content/family-social-supports/services-for-people-with-disabilities/disability-assistance/on-disability-assistance/annual-earnings-exemption',
  bcSupplements: 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/bc-employment-and-assistance-rate-tables/general-supplements-and-programs-rate-table',
  cdb: 'https://www.canada.ca/en/services/benefits/disability/canada-disability-benefit.html',
  ccb: 'https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html',
  rdsp: 'https://www.canada.ca/en/employment-social-development/programs/disability/savings/how-much.html',
};

// Federal figures for the 2026-27 benefit year, checked 2026-10-02.
const FEDERAL = {
  cdb: { year: '2026-27', maxMonthly: 204.2, incomeThreshold: { single: 23483, couple: 33182.5 }, workingIncomeExemption: { single: 10210, couple: 14294 }, ages: [18, 64], source: SOURCES.cdb },
  ccb: { year: '2026-27', maxPerYear: { under6: 8157, age6to17: 6883 }, fullBenefitBelowIncome: 38237, source: SOURCES.ccb },
  rdsp: {
    year: 2026, lifetimeGrant: LIMITS.GRANT_LIFETIME, lifetimeBond: LIMITS.BOND_LIFETIME, lifetimeContributions: LIMITS.CONTRIBUTION_LIFETIME,
    yearlyGrantMaxWithCarryForward: LIMITS.GRANT_YEARLY_MAX, yearlyBondMaxWithCarryForward: LIMITS.BOND_YEARLY_MAX, carryForwardYears: LIMITS.CARRY_YEARS, lastYearAge: LIMITS.LAST_AGE,
    perYear: ENTITLEMENT, bands: { low: 'family income under $38,237', mid: 'up to $117,045', high: 'above $117,045' }, source: SOURCES.rdsp,
  },
};

function buildOpenData() {
  return {
    name: 'Talli open data',
    license: 'Free to use, no key needed. Always check the linked official source before you rely on a number.',
    updated: '2026-10-02',
    payDates: { province: 'bc', what: 'BC income and disability assistance cheque issue dates. Each date is the day the payment is issued.', source: SOURCES.bcPayDates, dates: CHEQUE_ISSUE_DATES },
    bc: {
      disabilityAssistance: {
        asOf: '2025-12-01', source: SOURCES.bcRates,
        supportByFamilyUnit: SUPPORT,
        shelterByUnitSize: Object.fromEntries(Object.entries(SHELTER).map(([unit, [min, max]]) => [unit, { min, max }])),
        shelterAfterUnit10: { extraMinPerPerson: 25, extraMaxPerPerson: 50 },
        transportSupplementPerPwdAdult: 52,
      },
      earningsExemption: { source: SOURCES.bcEarnings, byYear: EARNINGS_EXEMPTION },
      supplements: CATALOG.map(({ id, name, kind, amount, max }) => ({ id, name, kind, amount, max, source: SOURCES.bcSupplements })),
    },
    federal: FEDERAL,
    provinces: listProvinces(),
  };
}

module.exports = { buildOpenData, SOURCES };
