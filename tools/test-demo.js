// Reviewer demo account: right password only, never a real credential path.
const assert = require('assert');
process.env.DEMO_PASSWORD = 'correct horse';
const { isDemoLogin, demoResults, DEMO_USERNAME } = require('../src/demo');
const { parseMessages } = require('../src/parse-messages');
assert.ok(isDemoLogin(DEMO_USERNAME, 'correct horse'));
assert.ok(!isDemoLogin(DEMO_USERNAME, 'wrong'));
assert.ok(!isDemoLogin('someone', 'correct horse'));
delete process.env.DEMO_PASSWORD;
assert.ok(!isDemoLogin(DEMO_USERNAME, 'correct horse'), 'disabled without the secret');
const r = demoResults(new Date('2026-10-03T12:00:00Z'));
assert.ok(r.success && r.sections.Messages.allText.length >= 2);
assert.strictEqual(parseMessages(r.sections.Messages.allText).length, 3);
console.log('demo ok');
