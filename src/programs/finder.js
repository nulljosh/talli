// Benefit finder: a few questions in, every BC and federal program the person
// likely qualifies for out. One engine for web, iOS and macOS; the apps only
// render what this returns.
//
// Answers are {questionId: [optionId, ...]}. Single-choice questions hold one id.
// A program matches when every key in its `when` shares at least one value with
// the answer. Amounts were checked against the linked source on VERIFIED; when
// a rate changes, change it here and nowhere else.

const VERIFIED = '2026-10-02';

const BCEA_GENERAL = 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/bc-employment-and-assistance-rate-tables/general-supplements-and-programs-rate-table';
const BCEA_HEALTH = 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/bc-employment-and-assistance-rate-tables/health-supplements-and-programs-rate-table';
const MINISTRY_PHONE = '1-866-866-0800';

const QUESTIONS = [
  { id: 'status', text: 'What are you on right now?', options: [
    { id: 'pwd', label: 'PWD (disability assistance)' },
    { id: 'ia', label: 'Income assistance (welfare)' },
    { id: 'none', label: 'Neither' },
  ] },
  { id: 'disability', text: 'Do you have a disability or health condition that makes daily life or work hard?', skipIf: { status: ['pwd'] }, options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ] },
  { id: 'age', text: 'How old are you?', options: [
    { id: 'under19', label: 'Under 19' },
    { id: '19to49', label: '19 to 49' },
    { id: '50to59', label: '50 to 59' },
    { id: '60to64', label: '60 to 64' },
    { id: '65plus', label: '65 or older' },
  ] },
  { id: 'dtc', text: 'Are you approved for the Disability Tax Credit?', hint: 'The federal one, from the CRA. Your doctor fills out form T2201.', options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'unsure', label: 'Not sure' },
  ] },
  { id: 'rdsp', text: 'Do you have an RDSP open?', hint: 'Registered Disability Savings Plan.', options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ] },
  { id: 'housing', text: 'Where do you live?', options: [
    { id: 'rent', label: 'I rent' },
    { id: 'own', label: 'I own my home' },
    { id: 'none', label: 'No stable housing' },
  ] },
  { id: 'kids', text: 'Do you have children living with you?', options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ] },
  { id: 'work', text: 'Have you worked?', options: [
    { id: 'now', label: 'I work now' },
    { id: 'before', label: 'I used to work' },
    { id: 'never', label: 'I have not worked' },
  ] },
  { id: 'vehicle', text: 'Do you own or lease a vehicle?', hint: 'Yours, or one registered to a spouse or caregiver who drives you.', options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ] },
  { id: 'taxes', text: 'Did you file a tax return last year?', options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ] },
  { id: 'needs', text: 'Is any of this true right now?', hint: 'Pick all that fit, or none.', multi: true, options: [
    { id: 'crisis', label: 'Out of food, behind on rent or bills' },
    { id: 'lowincome', label: 'Little or no money coming in' },
    { id: 'diet', label: 'A medical condition that needs a special diet' },
    { id: 'pregnant', label: 'Pregnant or a new baby' },
    { id: 'dog', label: 'I have a guide or service dog' },
    { id: 'student', label: 'I am a student or want to be' },
  ] },
];

// Shorthand for the two ways someone counts as disabled here.
const ADULT = ['19to49', '50to59', '60to64', '65plus'];
const UNDER65 = ['under19', '19to49', '50to59', '60to64'];

// group: money (cash you can claim), savings (free or cheaper things),
// crisis (help this week), help (people who do the paperwork with you).
// yearly: the most a year this is worth in dollars, null when it depends.
// needsDtc: only pays once the Disability Tax Credit is approved.
// disabled: needs PWD or a self-reported disability.
const PROGRAMS = [
  {
    id: 'pwd', group: 'money', name: 'PWD designation',
    when: { status: ['ia', 'none'], age: ADULT.concat('under19') }, disabled: true,
    yearly: 17802, value: 'Up to $1,483.50 a month',
    why: 'You have a disability and are not on PWD. It pays $423.50 a month more than regular assistance and lets you earn $16,200 a year on top.',
    how: [
      'If you are not on income assistance yet, apply for that first at myselfserve.gov.bc.ca. PWD is added on top.',
      'Ask the ministry for the PWD application booklet (form HR2883).',
      'You fill out section 1. Your doctor fills out section 2. A doctor, nurse, social worker or other listed professional fills out section 3.',
      'Describe your worst days, not your best. The ministry decides on how much help you need with daily living.',
      'If you are turned down, ask for reconsideration within 20 business days. Many approvals happen there.',
    ],
    say: 'I would like to apply for the Persons with Disabilities designation. Can you send me the application booklet?',
    phone: MINISTRY_PHONE,
    link: 'https://www2.gov.bc.ca/gov/content/family-social-supports/services-for-people-with-disabilities/disability-assistance',
  },
  {
    id: 'ia', group: 'money', name: 'Income assistance',
    when: { status: ['none'], needs: ['lowincome', 'crisis'], age: ADULT },
    yearly: 12720, value: 'Up to $1,060 a month',
    why: 'You have little or no money coming in and are not on assistance.',
    how: [
      'Apply online at myselfserve.gov.bc.ca, or by phone if that is easier.',
      'Have ID, your SIN, bank statements and your rent details ready.',
      'If you have no food or are about to lose housing, say so. That makes it an urgent need and they must see you faster.',
    ],
    say: 'I need to apply for income assistance and I have an urgent need for food and shelter.',
    phone: MINISTRY_PHONE,
    link: 'https://myselfserve.gov.bc.ca',
  },
  {
    id: 'dtc', group: 'money', name: 'Disability Tax Credit',
    when: { dtc: ['no', 'unsure'] }, disabled: true,
    yearly: null, value: 'Unlocks the Canada Disability Benefit and RDSP grants',
    why: 'It is the key to the federal programs. Without it you cannot get the Canada Disability Benefit or open an RDSP.',
    how: [
      'Start form T2201 in CRA My Account or by phone. You do your part, then your doctor or nurse practitioner does theirs.',
      'Being on PWD does not approve you automatically. The CRA decides separately.',
      'Once approved, ask the CRA to go back up to 10 years. Past years can come back as a lump sum.',
      'If your income is too low to use the credit, a spouse or parent who supports you can claim it.',
    ],
    say: 'I want to apply for the Disability Tax Credit. Can you start the T2201 for me and give me the reference number for my doctor?',
    phone: '1-800-959-8281',
    link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/segments/tax-credits-deductions-persons-disabilities/disability-tax-credit.html',
  },
  {
    id: 'cdb', group: 'money', name: 'Canada Disability Benefit',
    when: { age: ['19to49', '50to59', '60to64'] }, disabled: true, needsDtc: true,
    yearly: 2450, value: 'Up to $204.20 a month',
    why: 'You are 18 to 64 with a disability. BC does not take it off your PWD cheque.',
    how: [
      'You need the Disability Tax Credit approved and last year\'s tax return filed.',
      'Apply online with Service Canada, by phone, or in person.',
      'Payments go back to the month you applied, so apply even while you wait on anything else.',
    ],
    say: 'I am approved for the Disability Tax Credit and want to apply for the Canada Disability Benefit.',
    phone: '1-833-486-3007',
    link: 'https://www.canada.ca/en/services/benefits/disability/canada-disability-benefit.html',
  },
  {
    id: 'rdsp', group: 'money', name: 'RDSP grants and bonds',
    when: { rdsp: ['no'], age: ['under19', '19to49'] }, disabled: true, needsDtc: true,
    yearly: 1000, value: '$1,000 a year free, up to $4,500 if you contribute',
    why: 'You have no RDSP. On a low income the government puts in $1,000 a year even if you put in nothing, and matches up to 3 to 1 when you do.',
    how: [
      'Open an RDSP at a bank or credit union. It costs nothing to open.',
      'Ask for the bond and the grant on the application. Both are checkboxes.',
      'Unused bonds and grants carry forward 10 years, so opening late can still catch up thousands.',
      'An RDSP does not count against the PWD asset limit.',
    ],
    say: 'I want to open an RDSP and apply for the Canada Disability Savings Bond and Grant, including any carry forward.',
    link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-disability-savings-plan-rdsp.html',
  },
  {
    id: 'transport', group: 'money', name: 'Transportation supplement or bus pass',
    when: { status: ['pwd'] },
    yearly: 624, value: '$52 a month, or a bus pass',
    why: 'Everyone on PWD gets one or the other. Check your cheque stub: if you see neither, you are missing it.',
    how: [
      'Decide which you want: $52 cash on your cheque, or a BC Bus Pass that works on TransLink and BC Transit.',
      'Switch any time in My Self Serve or by phone.',
    ],
    say: 'I am on PWD. Can you confirm I am getting the transportation supplement, and switch it to the bus pass (or cash)?',
    phone: MINISTRY_PHONE,
    link: BCEA_GENERAL,
  },
  {
    id: 'cppd', group: 'money', name: 'CPP Disability',
    when: { work: ['now', 'before'], age: UNDER65 }, disabled: true,
    yearly: null, value: 'Up to $1,741.20 a month',
    why: 'You have worked and paid into CPP. If you are on PWD the ministry takes it off your cheque, but it protects your CPP retirement pension and keeps paying if you ever leave PWD.',
    how: [
      'You need to have paid into CPP in 4 of the last 6 years, or 3 of the last 6 if you paid in for 25 years.',
      'Apply through My Service Canada Account. Your doctor completes a medical report.',
      'If you are turned down, you have 90 days to ask for reconsideration.',
    ],
    say: 'I want to apply for the Canada Pension Plan disability benefit. Can you check whether I have enough contributions?',
    phone: '1-800-277-9914',
    link: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-disability-benefit.html',
  },
  {
    id: 'cwb', group: 'money', name: 'Canada Workers Benefit',
    when: { work: ['now'], age: ADULT },
    yearly: 1633, value: 'Up to $1,633 a year, plus $843 with the Disability Tax Credit',
    why: 'You work and your income is low. It comes with your tax refund.',
    how: [
      'File your tax return and fill out Schedule 6. Most tax software does it for you.',
      'With the Disability Tax Credit you also get the disability supplement.',
    ],
    link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-45300-canada-workers-benefit-cwb/how-much-you-can-get.html',
  },
  {
    id: 'file_taxes', group: 'money', name: 'File your taxes, free',
    when: { taxes: ['no'] },
    yearly: null, value: 'GST/HST credit, renter\'s credit and more',
    why: 'You did not file last year. Almost every benefit on this list is paid from your tax return, even with no income.',
    how: [
      'A free tax clinic will file it for you if your income is modest. Bring your T5007 slip from the ministry.',
      'You can file up to 10 years back and collect credits you missed.',
      'Disability Alliance BC runs Tax AID, free tax filing for people on PWD.',
    ],
    phone: '1-800-663-1278',
    link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/community-volunteer-income-tax-program.html',
  },
  {
    id: 'renters_credit', group: 'money', name: 'BC renter\'s tax credit',
    when: { housing: ['rent'], age: ADULT },
    yearly: 400, value: 'Up to $400 a year',
    why: 'You rent. It is paid with your tax refund even if you owe no tax.',
    how: ['Claim it on your BC tax return (form BC479). You need to have rented for at least 6 months of the year.'],
    link: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/renters-tax-credit',
  },
  {
    id: 'diet', group: 'money', name: 'Diet and nutrition supplements',
    when: { status: ['pwd', 'ia'], needs: ['diet'] },
    yearly: 960, value: '$15 to $80 a month',
    why: 'You are on assistance with a condition that needs a special diet. Diabetes is $60 a month, gluten free or high protein $65, cystic fibrosis $80.',
    how: [
      'Ask the ministry for the diet supplement form and have your doctor or dietitian confirm the condition.',
      'On PWD with a chronic, worsening condition? Ask about the Monthly Nutritional Supplement instead: up to $180 for food plus $45 for vitamins.',
    ],
    say: 'I have a medical condition that needs a special diet. Can you send me the diet supplement form?',
    phone: MINISTRY_PHONE,
    link: BCEA_HEALTH,
  },
  {
    id: 'natal', group: 'money', name: 'Natal supplement',
    when: { status: ['pwd', 'ia'], needs: ['pregnant'] },
    yearly: 960, value: '$80 a month',
    why: 'You are pregnant or have a baby under 7 months and are on assistance. Twins pay $160.',
    how: ['Tell the ministry and send a note from your doctor or midwife confirming the pregnancy or birth.'],
    say: 'I am pregnant and on assistance. I would like the natal supplement.',
    phone: MINISTRY_PHONE,
    link: BCEA_HEALTH,
  },
  {
    id: 'dog', group: 'money', name: 'Guide and service dog supplement',
    when: { status: ['pwd', 'ia'], needs: ['dog'] },
    yearly: 1140, value: '$95 a month',
    why: 'You have a certified guide or service dog and are on assistance.',
    how: ['Send the ministry your dog\'s certification under the BC Guide Dog and Service Dog Act.'],
    say: 'I have a certified service dog and would like the guide dog and service dog supplement.',
    phone: MINISTRY_PHONE,
    link: BCEA_GENERAL,
  },
  {
    id: 'kids', group: 'money', name: 'Money for your kids',
    when: { kids: ['yes'] },
    yearly: null, value: 'Canada Child Benefit, BC Family Benefit, school start-up',
    why: 'You have children at home. These are paid from your tax return and do not reduce assistance.',
    how: [
      'File taxes every year, both parents. The Canada Child Benefit and BC Family Benefit follow automatically.',
      'If your child has a disability, apply for the Disability Tax Credit for them. It adds the Child Disability Benefit.',
      'On assistance, the school start-up supplement comes each summer: $120 for ages 5 to 11, $210 for 12 and up.',
      'Ask about the Affordable Child Care Benefit if you pay for child care.',
    ],
    phone: '1-800-387-1193',
    link: 'https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html',
  },
  {
    id: 'student', group: 'money', name: 'Student grants for disabilities',
    when: { needs: ['student'] }, disabled: true,
    yearly: null, value: 'Grants you never repay',
    why: 'You are a student with a disability. There are grants for tuition and separate ones for equipment and services.',
    how: [
      'Apply through StudentAid BC and fill out the disability section. One application covers the federal and BC grants.',
      'On PWD, tell your worker before you start. You can study and keep assistance.',
      'Your school\'s accessibility office can help with the paperwork.',
    ],
    link: 'https://studentaidbc.ca',
  },
  {
    id: 'winter', group: 'money', name: 'Winter supplement', auto: true,
    when: { status: ['pwd', 'ia'] },
    yearly: 60, value: '$60 each December',
    why: 'Everyone on assistance gets it. It is $120 for couples and families, plus $20 a child.',
    how: ['Nothing to do. It comes with your December payment. If it does not, call.'],
    phone: MINISTRY_PHONE,
    link: BCEA_GENERAL,
  },
  {
    id: 'oas', group: 'money', name: 'Old Age Security and GIS',
    when: { age: ['60to64', '65plus'] },
    yearly: null, value: 'Replaces PWD at 65',
    why: 'At 65 your income moves from the ministry to federal pensions. A late application means a gap with no money.',
    how: [
      'Apply for OAS and the Guaranteed Income Supplement 6 months before you turn 65.',
      'Ask the ministry to keep your medical coverage. People leaving PWD for OAS usually keep it.',
      'BC adds the Senior\'s Supplement automatically once GIS starts.',
    ],
    phone: '1-800-277-9914',
    link: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security.html',
  },
  {
    id: 'fuel', group: 'savings', name: 'Fuel tax refund and ICBC discount',
    when: { vehicle: ['yes'] }, disabled: true,
    yearly: 500, value: 'Up to $500 a year, plus 25% off basic insurance',
    why: 'You have a disability and a vehicle. PWD is accepted as proof.',
    how: [
      'Register once for the fuel tax refund program (form FIN 119).',
      'Take the confirmation letter to your Autoplan broker for 25% off ICBC basic insurance.',
      'Keep gas receipts and send form FIN 472 once a year.',
    ],
    phone: '1-877-388-4440',
    link: 'https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/motor-fuel-carbon-tax/apply-for-refund',
  },
  {
    id: 'dental', group: 'savings', name: 'Dental and glasses', auto: true,
    when: { status: ['pwd'] },
    yearly: 500, value: '$1,000 of dental every 2 years',
    why: 'It comes with PWD. Many people never use it because nobody told them.',
    how: [
      'Give the dentist your care card number and say you are on PWD. They bill the ministry directly.',
      'Ask before treatment whether they charge above the ministry rate.',
      'Eye exams are covered every 2 years and basic glasses every 3.',
    ],
    link: 'https://www2.gov.bc.ca/gov/content/family-social-supports/services-for-people-with-disabilities/disability-assistance/on-disability-assistance/supplements-and-other-help',
  },
  {
    id: 'cdcp', group: 'savings', name: 'Canadian Dental Care Plan',
    when: { status: ['ia', 'none'] },
    yearly: null, value: 'Free or low cost dental',
    why: 'You have no ministry dental plan. It covers people with household income under $90,000 and no private insurance.',
    how: ['File your taxes, then apply online or by phone. Coverage starts on the date in your welcome letter.'],
    phone: '1-833-537-4342',
    link: 'https://www.canada.ca/en/services/benefits/dental/dental-care-plan.html',
  },
  {
    id: 'pharmacare', group: 'savings', name: 'Prescriptions paid in full', auto: true,
    when: { status: ['pwd', 'ia'] },
    yearly: null, value: 'PharmaCare Plan C, 100% covered',
    why: 'On assistance your eligible prescriptions cost nothing. If a pharmacy charges you, something is set up wrong.',
    how: ['Show your care card. If you are charged, ask the pharmacist to check Plan C, then call the ministry.'],
    phone: MINISTRY_PHONE,
    link: 'https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/pharmacare-for-bc-residents',
  },
  {
    id: 'fair_pharmacare', group: 'savings', name: 'Fair PharmaCare',
    when: { status: ['none'] },
    yearly: null, value: 'Lower prescription costs',
    why: 'You are not on assistance. The lower your income, the more of your prescriptions BC pays.',
    how: ['Register online or by phone with your care card and SIN. It takes about 10 minutes.'],
    phone: '1-800-663-7100',
    link: 'https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/pharmacare-for-bc-residents',
  },
  {
    id: 'medical', group: 'savings', name: 'Medical equipment and travel',
    when: { status: ['pwd'] },
    yearly: null, value: 'Equipment, supplies, and trips to specialists',
    why: 'PWD pays for things like wheelchairs, hearing aids, orthotics and medical supplies, and for travel to appointments outside your community.',
    how: [
      'Ask before you buy. The ministry needs a prescription or assessment and approves it first.',
      'For travel, call before the appointment. It pays $0.36 a kilometre or the cheapest fare, plus meals.',
    ],
    say: 'I am on PWD and need (the item). What do you need from my doctor to approve it?',
    phone: MINISTRY_PHONE,
    link: BCEA_HEALTH,
  },
  {
    id: 'internet', group: 'savings', name: 'Internet for $20 a month',
    when: { status: ['pwd'] },
    yearly: null, value: 'TELUS Internet for Good',
    why: 'People on PWD qualify for unlimited home internet at $20 a month, and a low cost phone plan.',
    how: ['Apply on the TELUS site with proof of PWD, such as your confirmation of assistance from My Self Serve.'],
    link: 'https://www.telus.com/en/social-impact/connecting-canada/connecting-for-good-programs/people-with-disabilities',
  },
  {
    id: 'ferries', group: 'savings', name: 'Half price on BC Ferries',
    when: {}, disabled: true,
    yearly: null, value: '50% off passenger fares',
    why: 'BC residents with a permanent disability pay half. Proof of PWD is enough, no medical forms.',
    how: ['Apply for the BC Ferries Accessible Fare card. An escort travelling with you also gets the discount.'],
    link: 'https://www.bcferries.com/accessibility',
  },
  {
    id: 'parks', group: 'savings', name: 'Free camping in BC Parks',
    when: { status: ['pwd'] },
    yearly: null, value: 'Free campsites and parking',
    why: 'People on PWD camp free at frontcountry BC Parks campgrounds.',
    how: ['Show proof of PWD at the park. If you reserve ahead you pay only the $6 a night reservation fee.'],
    link: 'https://bcparks.ca/reservations/camping-fees/social-services-exemption/',
  },
  {
    id: 'leisure', group: 'savings', name: 'Free or cheap rec centre pass',
    when: { status: ['pwd', 'ia'] },
    yearly: null, value: 'Pools, gyms, programs',
    why: 'Most BC cities give people on assistance a leisure access pass.',
    how: ['Ask at your local rec centre for the leisure access or recreation assistance program. Bring proof of assistance.'],
    link: 'https://bc.211.ca',
  },
  {
    id: 'homeowner', group: 'savings', name: 'Home owner grant for disabilities',
    when: { housing: ['own'] }, disabled: true,
    yearly: 275, value: '$275 more off property tax',
    why: 'You own your home and have a disability. The grant is higher than the regular one.',
    how: [
      'Claim the additional grant for a person with disabilities when you pay property tax each year.',
      'Ask about property tax deferment too. It lets you put off the tax until the home is sold.',
      'Accessibility renovations can earn a refundable credit up to $1,000 on your tax return.',
    ],
    phone: '1-888-355-2700',
    link: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant',
  },
  {
    id: 'safer', group: 'money', name: 'SAFER rent subsidy',
    when: { housing: ['rent'], age: ['60to64', '65plus'] },
    yearly: null, value: 'Monthly help with rent',
    why: 'You are 60 or older and rent. It is for people not on ministry assistance, so it matters most once you move to OAS.',
    how: ['Apply to BC Housing with your lease and last tax return.'],
    phone: '1-800-257-7756',
    link: 'https://www.bchousing.org/housing-assistance/rental-assistance-programs',
  },
  {
    id: 'rap', group: 'money', name: 'Rental Assistance Program',
    when: { housing: ['rent'], kids: ['yes'], work: ['now'], status: ['none'] },
    yearly: null, value: 'Monthly help with rent',
    why: 'You work, rent, and have children at home.',
    how: ['Apply to BC Housing with your lease, pay stubs and last tax return.'],
    phone: '1-800-257-7756',
    link: 'https://www.bchousing.org/housing-assistance/rental-assistance-programs',
  },
  {
    id: 'crisis', group: 'crisis', name: 'Crisis supplement',
    when: { status: ['pwd', 'ia'], needs: ['crisis'] },
    yearly: null, value: 'Food, shelter or clothing money now',
    why: 'You are on assistance and hit something you could not plan for. It does not have to be paid back.',
    how: [
      'Ask in My Self Serve or by phone. Say what happened and that you have no other way to cover it.',
      'Food is up to $50 a person each month. Clothing is up to $110 a year. Shelter can cover rent or a utility bill to stop an eviction or shutoff.',
      'You can ask every month there is a real need. A no can be reconsidered.',
    ],
    say: 'I need a crisis supplement. This was unexpected, I have no other resources, and without it I will go without food (or lose my housing).',
    phone: MINISTRY_PHONE,
    link: BCEA_GENERAL,
  },
  {
    id: 'hydro', group: 'crisis', name: 'BC Hydro Customer Crisis Fund',
    when: { needs: ['crisis'], housing: ['rent', 'own'] },
    yearly: null, value: 'Grant up to $600',
    why: 'You are behind on bills. If the hydro account is in your name and you face disconnection, the grant pays it down.',
    how: ['Apply online or by phone. You need to owe under $1,000 and have had a hardship like a job loss, illness or a death in the family.'],
    phone: '1-800-224-9376',
    link: 'https://app.bchydro.com/accounts-billing/bill-payment/ways-to-pay/bill-help.html',
  },
  {
    id: 'rentbank', group: 'crisis', name: 'BC Rent Bank',
    when: { needs: ['crisis'], housing: ['rent'] },
    yearly: null, value: 'Interest free loan for rent',
    why: 'You are behind on rent. A rent bank can cover it to stop an eviction, with no interest.',
    how: ['Apply online. A case worker calls you back, usually within a few days.'],
    link: 'https://bcrentbank.ca',
  },
  {
    id: 'hatc', group: 'money', name: 'Home Accessibility Tax Credit',
    when: { dtc: ['yes'] }, disabled: true,
    yearly: null, value: 'Up to $3,000 back on accessibility work',
    why: 'You have the Disability Tax Credit. Ramps, grab bars, wider doors, a walk-in shower or a stair lift earn 15% back on up to $20,000 a year.',
    how: [
      'Keep every receipt for changes that make your home safer or easier to use.',
      'Claim it on your federal tax return (line 31285).',
      'Renting? You can still claim what you paid, but ask your landlord first.',
    ],
    link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31285-home-accessibility-expenses.html',
  },
  {
    id: 'bc_reno', group: 'money', name: 'BC home renovation tax credit',
    when: {}, disabled: true,
    yearly: null, value: 'Up to $1,000, refundable',
    why: 'BC pays 10% of up to $10,000 of accessibility renovations. Refundable means you get it even if you owe no tax.',
    how: [
      'Keep the receipts for work that helps you get in, move around or stay safe at home.',
      'Claim it on your BC tax return (form BC479).',
      'You can claim this one and the federal credit for the same work.',
    ],
    link: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/seniors-renovation',
  },
  {
    id: 'metc', group: 'money', name: 'Medical expense tax credit',
    when: { taxes: ['yes'] }, disabled: true,
    yearly: null, value: 'Claim medicine, dental, glasses, a service dog, attendant care',
    why: 'Medical costs you paid yourself can lower your tax. A service animal and attendant care count too.',
    how: [
      'Add up prescriptions, dental, glasses, hearing aids, a service dog, and help with personal care.',
      'You can claim what is over 3% of your net income or $2,890, whichever is less.',
      'It only lowers tax you owe. If you work, look at the refundable supplement next.',
    ],
    link: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4065/medical-expenses.html',
  },
  {
    id: 'med_supplement', group: 'money', name: 'Refundable medical expense supplement',
    when: { work: ['now'], taxes: ['yes'], age: ADULT }, disabled: true,
    yearly: 1534, value: 'Up to $1,534 a year if you work',
    why: 'You work and have medical costs. This one is paid out even if you owe no tax: 25% of your medical expenses, up to $1,534.',
    how: [
      'You need at least $4,478 of work income for the year.',
      'Claim it on your tax return (line 45200). Most tax software asks the question for you.',
    ],
    link: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4065/medical-expenses.html',
  },
  {
    id: 'climate', group: 'money', name: 'BC Climate Action Tax Credit', auto: true,
    when: { taxes: ['yes'] },
    yearly: null, value: 'Up to $504 a year, paid with your GST credit',
    why: 'Low income BC residents get it with the GST/HST credit. It is $126 more for each child.',
    how: ['Nothing to apply for. Keep filing your taxes. Your amount shows in CRA My Account.'],
    link: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/climate-action',
  },
  {
    id: 'taxfree', group: 'savings', name: 'No GST or PST on assistive devices',
    when: {}, disabled: true,
    yearly: null, value: 'Wheelchairs, glasses, hearing aids and more',
    why: 'Qualifying medical and assistive devices carry no GST, and BC takes the PST off specified medical and disability equipment.',
    how: ['Ask for the exemption at the till or when you order. Keep the receipt.', 'If tax was charged by mistake, ask the seller to fix it.'],
    link: 'https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/exemptions',
  },
  {
    id: 'ccb', only: 'federal', group: 'money', name: 'Canada Child Benefit',
    when: { kids: ['yes'], taxes: ['yes', 'no'] },
    yearly: null, value: 'Up to $8,157 a year for a child under 6',
    why: 'You have children at home. It is $6,883 a year for ages 6 to 17, paid monthly and reduced as family income rises. If your child has the Disability Tax Credit there is a top-up too.',
    how: [
      'File your taxes every year. The benefit follows automatically once you are set up.',
      'New baby or new to Canada? Apply in CRA My Account or on the Canada Child Benefit form.',
      'Tell the CRA when a child moves in or out so the amount stays right.',
    ],
    phone: '1-800-387-1193',
    link: 'https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html',
  },
  {
    id: 'advocate', group: 'help', name: 'A free advocate',
    when: {},
    yearly: null, value: 'Someone who does the forms with you',
    why: 'Advocates get people approved every day and it costs nothing. You do not have to do this alone.',
    how: [
      'Disability Alliance BC helps with PWD, CPP Disability, the Disability Tax Credit, RDSPs and taxes.',
      'Call 211 any time to find an advocate, food bank or shelter near you.',
    ],
    phone: '1-800-663-1278',
    link: 'https://disabilityalliancebc.org',
  },
];

// Federal-only mode: for anyone without a provincial portal. Only federal programs, and
// only the questions they need; the BC answers are filled with neutral defaults.
const FEDERAL_IDS = new Set(['dtc', 'cdb', 'rdsp', 'cppd', 'cwb', 'file_taxes', 'hatc', 'metc', 'med_supplement', 'oas', 'cdcp', 'ccb', 'advocate']);
const FEDERAL_QUESTIONS = ['disability', 'age', 'dtc', 'rdsp', 'kids', 'work', 'taxes'];
const FEDERAL_DEFAULTS = { status: ['none'], housing: ['rent'], vehicle: ['no'], needs: [] };

const QUESTION_IDS = new Set(QUESTIONS.map((q) => q.id));
const OPTION_IDS = Object.fromEntries(QUESTIONS.map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
const PROGRAM_IDS = new Set(PROGRAMS.map((p) => p.id));

// Keep only known question and option ids; `have` holds program ids the person
// already gets. Anything else in the body is dropped.
function cleanAnswers(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
    const list = (Array.isArray(v) ? v : [v]).map(String);
    if (QUESTION_IDS.has(k)) out[k] = list.filter((x) => OPTION_IDS[k].has(x));
    else if (k === 'have') out.have = list.filter((x) => PROGRAM_IDS.has(x));
  }
  return out;
}

const hits = (answers, cond) => Object.entries(cond).every(([k, allowed]) => (answers[k] || []).some((a) => allowed.includes(a)));

// What Talli already knows from the person's own profiles, so they are not asked twice.
function prefill({ pwd, dtc, rdsp, cdb } = {}) {
  const out = {};
  const good = (p, list) => list.includes(p?.status);
  if (good(pwd, ['approved'])) out.status = ['pwd'];
  if (good(dtc, ['approved'])) out.dtc = ['yes'];
  if (good(rdsp, ['account_opened', 'funded', 'active'])) out.rdsp = ['yes'];
  if (good(cdb, ['approved', 'funded'])) out.have = ['cdb'];
  return out;
}

function findBenefits(rawAnswers, { scope = 'all' } = {}) {
  const federal = scope === 'federal';
  const answers = federal ? { ...FEDERAL_DEFAULTS, ...cleanAnswers(rawAnswers), ...FEDERAL_DEFAULTS } : cleanAnswers(rawAnswers);
  const pool = QUESTIONS.filter((q) => !federal || FEDERAL_QUESTIONS.includes(q.id));
  const questions = pool.filter((q) => !(q.skipIf && hits(answers, q.skipIf)));
  // `needs` may be legitimately empty, so it counts as answered once present.
  const complete = questions.every((q) => (q.multi ? answers[q.id] !== undefined : (answers[q.id] || []).length > 0));
  const disabled = (answers.status || []).includes('pwd') || (answers.disability || []).includes('yes');
  const hasDtc = (answers.dtc || []).includes('yes');
  const have = new Set(answers.have || []);

  const results = !complete ? [] : PROGRAMS
    .filter((p) => (federal ? FEDERAL_IDS.has(p.id) : p.only !== 'federal'))
    .filter((p) => (!p.disabled || disabled) && hits(answers, p.when))
    .map((p) => ({
      id: p.id, group: p.group, name: p.name, value: p.value, yearly: p.yearly ?? null,
      why: p.why, how: p.how, say: p.say || null, phone: p.phone || null, link: p.link,
      auto: !!p.auto, first: p.needsDtc && !hasDtc ? 'Get the Disability Tax Credit first' : null,
      have: have.has(p.id),
    }))
    .sort((a, b) => (b.yearly || 0) - (a.yearly || 0));

  // PWD already includes the income assistance rate, so never count both.
  const counted = results.filter((r) => !r.have && r.yearly && !(r.id === 'ia' && results.some((x) => x.id === 'pwd')));
  // Moving from income assistance to PWD is worth the difference, not the full rate.
  const worth = (r) => (r.id === 'pwd' && (answers.status || []).includes('ia') ? 5082 : r.yearly);
  return {
    verified: VERIFIED,
    scope,
    questions,
    answers,
    complete,
    results,
    missingYearly: counted.reduce((a, r) => a + worth(r), 0),
    missingCount: results.filter((r) => !r.have && !r.auto).length,
  };
}

module.exports = { findBenefits, prefill, cleanAnswers, QUESTIONS, PROGRAMS, VERIFIED };
