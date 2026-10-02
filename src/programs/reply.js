// Message replies. Reads a ministry message, says what it is asking in plain
// words, and drafts a short reply. Rules, not AI: free, instant, nothing leaves
// the server. The person sends it in My Self Serve; Talli cannot, and says so.

const PHONE = '1-866-866-0800';
const LINK = 'https://myselfserve.gov.bc.ca/Auth/Messages';

// First match wins, so order is most specific first.
const KINDS = [
  {
    kind: 'decision', label: 'A decision',
    match: /\b(denied|not eligible|ineligible|discontinu\w*|cancel\w*|no longer eligible|decision)\b/i,
    asks: 'The ministry made a decision about your file. If it went against you, the clock is already running: you have 20 business days to ask them to reconsider.',
    reply: `Hello,\n\nI received your message about the decision on my file. Please send me a copy of the information you used to make it, and the reasons in writing.\n\nI do not agree with the decision and I am asking for reconsideration. I will send my request on the Request for Reconsideration form.\n\nThank you,\n[your name]\n[your phone]`,
    extra: ['Open the Reconsideration helper in Talli. It counts your deadline and drafts the letter.', 'Do not wait for a reply to this message before you start.'],
  },
  {
    kind: 'overpayment', label: 'Money you may owe',
    match: /\b(overpay\w*|owe\w*|repay\w*|debt|recover\w*|deduct\w*)\b/i,
    asks: 'The ministry thinks they paid you too much and wants it back, usually by taking a little off each cheque.',
    reply: `Hello,\n\nI received your message about an overpayment. Please send me a breakdown: the months it covers, how you worked out the amount, and what I reported for those months.\n\nIf the amount is right, I would like to repay it in small monthly deductions I can afford, and I am asking that the deduction stay as low as the rules allow. If I think it is wrong, I will ask for reconsideration.\n\nThank you,\n[your name]\n[your phone]`,
    extra: ['Check your own monthly reports for those months before you agree to the number.', 'You can ask for a lower deduction. They often agree.'],
  },
  {
    kind: 'documents', label: 'Papers they want',
    match: /\b(provide|submit|send us|supporting|documents?|proof|verif\w*|receipts?|bank statements?|pay ?stubs?)\b/i,
    asks: 'The ministry needs a paper or proof from you. If you do not send it by their date, your cheque can be held.',
    reply: `Hello,\n\nIn reply to your message, I am sending the following: [list the documents].\n\nPlease confirm that you received them, and tell me if you need anything else.\n\nThank you,\n[your name]\n[your phone]`,
    extra: ['Find the date they gave you and send before it.', 'Keep a copy and proof that you sent it. Documents in your Talli vault are ready to attach.'],
  },
  {
    kind: 'appointment', label: 'A meeting or call',
    match: /\b(appointment|interview|meeting|review|call you|contact you|reassess\w*)\b/i,
    asks: 'The ministry wants to speak to you or see you on a date.',
    reply: `Hello,\n\nIn reply to your message, I can attend on [date and time you were given]. Please confirm.\n\nIf I need any help to take part, such as a phone call instead of a visit, I will let you know ahead of time.\n\nThank you,\n[your name]\n[your phone]`,
    extra: [`If the time does not work, say so right away and give two other times, or call ${PHONE}.`],
  },
  {
    kind: 'report', label: 'Your monthly report',
    match: /\b(monthly report|income report|report|declare|declaration)\b/i,
    asks: 'The ministry is reminding you about your monthly report. Reports are due on the 1st to the 5th, and a late one can hold your cheque.',
    reply: `Hello,\n\nIn reply to your message about my monthly report: I filed my report for [month] on [date]. Please confirm that you received it.\n\nIf you did not, please tell me what is missing and I will send it today.\n\nThank you,\n[your name]\n[your phone]`,
    extra: ['Open Talli on the 1st. The reporting window banner has a File now button.'],
  },
  {
    kind: 'details', label: 'Your details',
    match: /\b(address|bank|direct deposit|phone number|contact information|banking)\b/i,
    asks: 'The ministry needs your address, bank or phone details to be right so payments and mail reach you.',
    reply: `Hello,\n\nIn reply to your message, my details are:\n[the address, bank account or phone number they asked for]\n\nPlease update my file and confirm in writing when it is done.\n\nThank you,\n[your name]\n[your phone]`,
    extra: ['Do not put your full bank account number in a message you can avoid. Call and say it instead.'],
  },
];

const GENERAL = {
  kind: 'general', label: 'A message',
  asks: 'Talli is not sure what this one needs. Read it for a date or a thing they want from you, and answer that.',
  reply: `Hello,\n\nThank you for your message. In reply: [answer what they asked, in a sentence or two].\n\nPlease confirm that you received this, or call me if you need more.\n\nThank you,\n[your name]\n[your phone]`,
  extra: ['If it has a deadline, call the ministry to be sure.'],
};

function draftReply(text) {
  const body = String(text ?? '').slice(0, 5000);
  if (!body.trim()) return null;
  const hit = KINDS.find((k) => k.match.test(body)) || GENERAL;
  return {
    kind: hit.kind, label: hit.label, asks: hit.asks, reply: hit.reply,
    extra: hit.extra, phone: PHONE, link: LINK,
    note: 'Talli writes the reply. You send it in My Self Serve, or say it on the phone.',
  };
}

module.exports = { draftReply, KINDS };
