const assert = require('assert');
const { parseMessages, hasMoreMessages, countMessages } = require('../src/parse-messages');

// NOTE: these fixtures deliberately contain NO newlines. http-scraper.js
// collapses all whitespace before this parser ever sees the data, so any test
// fixture with '\n' in it is testing an input shape that cannot occur. The
// previous copy-pasted test did exactly that, which is why the broken
// newline-splitting parser passed CI while shipping garbage to the app.

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${error.message}`);
  }
}

// Real rows as they appear on myselfserve.gov.bc.ca, whitespace-collapsed.
const PORTAL_LINES = [
  'Skip to main content',
  'Messages',
  '2026 / JUL / 14',
  '! ACTION REQUIRED: Monthl…',
  '2026 / JUN / 30',
  'Monthly Report Reminder',
  '2026 / MAY / 25',
  'Reconsideration for PWD d…',
  '2026 / MAY / 25',
  'Extension Granted',
  '2026 / MAR / 02',
  'CDCP Dental Message',
  '2026 / JAN / 06',
  'Persons with Disabilities (P…',
  'Show More Messages'
];

test('parses date + subject pairs into dated messages', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.strictEqual(msgs.length, 6, `expected 6 messages, got ${msgs.length}`);
  assert.strictEqual(msgs[0].timestamp, '2026-07-14');
  assert.strictEqual(msgs[0].text, 'ACTION REQUIRED: Monthl…');
  assert.strictEqual(msgs[1].timestamp, '2026-06-30');
  assert.strictEqual(msgs[1].text, 'Monthly Report Reminder');
});

test('uppercase 3-letter months map to ISO dates', () => {
  const msgs = parseMessages(PORTAL_LINES);
  const dates = msgs.map(m => m.timestamp);
  assert.deepStrictEqual(dates, [
    '2026-07-14', '2026-06-30', '2026-05-25', '2026-05-25', '2026-03-02', '2026-01-06'
  ]);
});

test('timestamp is never null for a dated row (the old parser always was)', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.ok(msgs.every(m => m.timestamp !== null), 'a dated row lost its timestamp');
});

test('date is stripped out of the subject text', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.ok(
    msgs.every(m => !/\d{4}\s*\/\s*[A-Z]{3}/.test(m.text)),
    'date leaked into message text'
  );
});

test('bare date lines do not become their own message rows', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.ok(
    msgs.every(m => m.text && !/^\d{4}/.test(m.text)),
    'a bare date line was emitted as a message'
  );
});

test('"!" marker becomes a flag without corrupting the subject', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.strictEqual(msgs[0].actionRequired, true);
  assert.ok(!msgs[0].text.startsWith('!'), 'the "!" marker leaked into the subject');
  assert.strictEqual(msgs[1].actionRequired, false);
});

test('ellipsis truncation is preserved verbatim', () => {
  const msgs = parseMessages(PORTAL_LINES);
  assert.ok(msgs[0].text.endsWith('…'), 'ellipsis was stripped from a truncated subject');
  assert.strictEqual(msgs[2].text, 'Reconsideration for PWD d…');
});

test('recurring subjects on different dates stay distinct', () => {
  const msgs = parseMessages([
    '2026 / JUL / 14', 'Monthly Report Reminder',
    '2026 / JUN / 30', 'Monthly Report Reminder',
    '2026 / MAY / 25', 'Monthly Report Reminder'
  ]);
  assert.strictEqual(msgs.length, 3, 'recurring reminders were wrongly collapsed');
  assert.strictEqual(new Set(msgs.map(m => m.id)).size, 3, 'recurring reminders share an id');
});

test('the exact same row repeated is deduped', () => {
  const msgs = parseMessages([
    '2026 / JUL / 14', 'Monthly Report Reminder',
    '2026 / JUL / 14', 'Monthly Report Reminder'
  ]);
  assert.strictEqual(msgs.length, 1);
});

test('ids are stable across parses so read-state survives a refresh', () => {
  const a = parseMessages(PORTAL_LINES).map(m => m.id);
  const b = parseMessages(PORTAL_LINES).map(m => m.id);
  assert.deepStrictEqual(a, b, 'ids changed between identical parses');
});

test('nav chrome and the Show More button are filtered out', () => {
  const texts = parseMessages(PORTAL_LINES).map(m => m.text);
  assert.ok(!texts.includes('Skip to main content'));
  assert.ok(!texts.includes('Messages'));
  assert.ok(!texts.some(t => /show more/i.test(t)));
});

test('date and subject collapsed onto one line still split correctly', () => {
  const msgs = parseMessages(['2026 / JUL / 14 ACTION REQUIRED: Monthl…']);
  assert.strictEqual(msgs.length, 1);
  assert.strictEqual(msgs[0].timestamp, '2026-07-14');
  assert.strictEqual(msgs[0].text, 'ACTION REQUIRED: Monthl…');
});

test('irregular slash spacing still parses', () => {
  assert.strictEqual(parseMessages(['2026/JUL/14', 'Information Required'])[0].timestamp, '2026-07-14');
  assert.strictEqual(parseMessages(['2026 /JUL/ 14', 'Information Required'])[0].timestamp, '2026-07-14');
});

test('unknown month yields a null timestamp rather than a wrong one', () => {
  // The old parser silently fell back to '01', inventing a January date.
  const msgs = parseMessages(['2026 / XXX / 14', 'Information Required']);
  assert.strictEqual(msgs.length, 1);
  assert.strictEqual(msgs[0].timestamp, null, 'an unknown month was coerced to a fake date');
});

test('hasMoreMessages detects the pagination button', () => {
  assert.strictEqual(hasMoreMessages(PORTAL_LINES), true);
  assert.strictEqual(hasMoreMessages(['2026 / JUL / 14', 'Monthly Report Reminder']), false);
});

test('countMessages agrees with the rendered list', () => {
  assert.strictEqual(countMessages(PORTAL_LINES), parseMessages(PORTAL_LINES).length);
});

test('empty and junk-only input yields no messages', () => {
  assert.deepStrictEqual(parseMessages([]), []);
  assert.deepStrictEqual(parseMessages(['Skip to main content', 'Sign Out', '']), []);
  assert.deepStrictEqual(parseMessages(undefined), []);
});

test('non-string entries are ignored', () => {
  const msgs = parseMessages([null, 42, {}, '2026 / JUL / 14', 'Monthly Report Reminder']);
  assert.strictEqual(msgs.length, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
