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
    defaults: { status: 'applied', submittedDate: null, deniedDate: null, notes: '' },
  },
  {
    id: 'rdsp',
    route: 'rdsp-profile',
    logTag: 'RDSP',
    name: 'Registered Disability Savings Plan (RDSP)',
    jurisdiction: 'CA-federal',
    validStatuses: ['pending', 'dtc_required', 'account_opened', 'funded', 'active', 'closed'],
    defaults: { status: 'pending', accountOpenedDate: null, accountNumber: null, notes: '' },
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
];

module.exports = { PROFILE_PROGRAMS };
