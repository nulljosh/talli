// Every client copy of the cheque issue schedule must match src/pay-dates.js, the one checked against gov.bc.ca.
// The web dashboard's copy drifted once and showed Oct 28 when the cheque came Oct 21.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CHEQUE_ISSUE_DATES } = require('../src/pay-dates');

const want = {};
for (const d of CHEQUE_ISSUE_DATES) {
  const [y, m, day] = d.split('-').map(Number);
  (want[y] = want[y] || {})[m - 1] = day;
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// web: 2026:{0:21,1:25,...}
const web = {};
for (const [, y, body] of read('web/unified.html').matchAll(/(\d{4}):\{([\d:,]+)\}/g))
  web[y] = Object.fromEntries(body.split(',').map((p) => p.split(':').map(Number)));
assert.deepStrictEqual(web, want, 'web/unified.html PAY_SCHEDULE');

// widgets: 2026: [0: 21, 1: 25, ...]
for (const f of ['widgets-ios/Models/WidgetAPI.swift', 'widgets-macos/Models/MacWidgetAPI.swift', 'watchos/Models/PaySchedule.swift']) {
  const got = {};
  for (const [, y, body] of read(f).matchAll(/(\d{4}): \[([\d:, ]+)\]/g))
    got[y] = Object.fromEntries(body.split(',').map((p) => p.split(':').map((x) => Number(x.trim()))));
  assert.deepStrictEqual(got, want, f);
}
// web: the Home payday list reads the same schedule
{
  const html = read('web/unified.html');
  const grab = (from, to) => html.slice(html.indexOf(from), html.indexOf(to, html.indexOf(from)));
  const src = grab('const PAY_SCHEDULE', 'function nextScheduledPayDate') + grab('function upcomingPaydays', '// Paydays on Home');
  const { upcomingPaydays, whenText } = new Function(src + 'return { upcomingPaydays, whenText };')();
  const oct20 = new Date(2026, 9, 20);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.deepStrictEqual(upcomingPaydays(3, oct20).map(iso), ['2026-10-21', '2026-11-18', '2026-12-16']);
  assert.strictEqual(iso(upcomingPaydays(1, new Date(2026, 9, 21))[0]), '2026-10-21', 'payday itself still counts until it passes');
  assert.deepStrictEqual(upcomingPaydays(6, oct20).map(iso), CHEQUE_ISSUE_DATES.filter((d) => d >= '2026-10-20').slice(0, 6));
  assert.strictEqual(whenText(new Date(2026, 9, 21), oct20), 'tomorrow');
  assert.strictEqual(whenText(oct20, oct20), 'today');
  assert.strictEqual(whenText(new Date(2026, 10, 18), oct20), 'in 29 days');
}
console.log('test-pay-schedule-sync: ok');
