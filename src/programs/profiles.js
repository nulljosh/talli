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
];

module.exports = { PROFILE_PROGRAMS };
