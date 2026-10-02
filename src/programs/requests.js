// Service requests. The common things people ask the ministry for, each with the
// exact words to say, what to have ready, and where to go. Talli cannot file
// these inside My Self Serve, so it gets the person to the right page prepared.

const PHONE = '1-866-866-0800';
const MYSS = 'https://myselfserve.gov.bc.ca';
const SUPPLEMENTS = 'https://www2.gov.bc.ca/gov/content/governments/policies-for-government/bcea-policy-and-procedure-manual/bc-employment-and-assistance-rate-tables/general-supplements-and-programs-rate-table';

const REQUESTS = [
  {
    id: 'crisis', name: 'Crisis supplement', when: 'Out of food, or about to lose housing or power',
    ready: ['What happened and when', 'Why you cannot cover it any other way', 'Any shutoff or eviction notice'],
    say: 'I need a crisis supplement. Something unexpected happened and I have no other way to pay for it. Without it I will go without food (or lose my housing). Can you help me today?',
    note: 'Food is up to $50 a person a month and clothing up to $110 a year. Shelter help can stop an eviction or a shutoff. If they say no, ask for it in writing and for reconsideration.',
    phone: PHONE, link: SUPPLEMENTS,
  },
  {
    id: 'address', name: 'Change my address', when: 'You moved, or you are about to',
    ready: ['New address and the day you move in', 'Your new rent amount', 'Your lease or a landlord letter'],
    say: 'I have moved and I need to change my address. My new address is [address], I moved on [date], and my rent is [amount] a month. Please update my file and confirm in writing.',
    note: 'Change it the week you move. Mail from the ministry goes to the old address, and missing a letter can hold your cheque. Tell them your new rent too, because your shelter amount depends on it.',
    phone: PHONE, link: MYSS,
  },
  {
    id: 'shelter', name: 'Update my shelter amount', when: 'Your rent went up or down',
    ready: ['Your new rent in writing', 'The date it changed', 'Your lease or the landlord notice'],
    say: 'My rent changed to [amount] a month starting [date]. Please update my shelter allowance and tell me what my new amount will be.',
    note: 'The shelter allowance has a maximum for your household size. If you pay more than that, the extra comes out of your support money. Ask what the maximum is for you.',
    phone: PHONE, link: MYSS,
  },
  {
    id: 'bank', name: 'Change my bank account', when: 'New bank or new account',
    ready: ['A void cheque or a bank letter with the account details', 'The date you want it to start'],
    say: 'I need to change the bank account my payments go to. I will give you the new details. Please confirm the date it takes effect so I keep the old account open until then.',
    note: 'Keep the old account open until your first payment lands in the new one. Say the account number on the phone instead of typing it in a message.',
    phone: PHONE, link: MYSS,
  },
  {
    id: 'cheque', name: 'My cheque did not come', when: 'Payment day passed and nothing arrived',
    ready: ['The date it was due', 'Whether you filed your monthly report', 'Your bank balance'],
    say: 'My payment was due on [date] and it has not arrived. Can you tell me the status, whether there is a hold on my file, and whether it was sent to the right account? If it cannot be fixed today I need a crisis supplement.',
    note: 'Talli also shows this on your home screen after a missed cheque. It names the usual cause and gives the five steps.',
    phone: PHONE, link: MYSS,
  },
  {
    id: 'ids', name: 'Update my documents', when: 'New ID, new letter, or they asked for papers',
    ready: ['The paper or ID they asked for', 'The date they gave you'],
    say: 'I am sending the documents you asked for: [list]. Please confirm you received them and that my file is up to date.',
    note: 'Keep a copy and proof you sent it. Papers in your Talli vault are ready to attach.',
    phone: PHONE, link: MYSS,
  },
];

function listRequests() {
  return REQUESTS.map((r) => ({ ...r }));
}

module.exports = { listRequests, REQUESTS };
