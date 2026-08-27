const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// In-process tests for web/js/webmcp.js:
//   - the registered tool set is exactly what we intend
//   - only the two filings are confirmation-gated
//   - no credential ever becomes a tool argument
//
// The last group is the point of this file. POST /api/submit-report accepts
// sin/phone/pin in its body, and the tool deliberately does not expose them --
// the route falls back to the encrypted PIN in the user's profile blob, so the
// credential never has to enter an agent's context. If someone later "helpfully"
// adds those arguments, this test fails.

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'web/js/webmcp.js'), 'utf8');

// Run the browser IIFE under Node with a stubbed modelContext. Registration is
// a sequential await loop, so the tools land across microtasks -- drain the
// queue before asserting, or you only ever see the first one.
async function loadTools() {
  const registered = [];
  const sandbox = {
    document: { modelContext: { registerTool: async (t) => { registered.push(t); return {}; } } },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    console: { warn() {} },
  };
  vm.runInNewContext(source, sandbox);
  await new Promise((resolve) => setImmediate(resolve));
  return registered;
}

async function main() {
const tools = await loadTools();
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
const names = tools.map((t) => t.name).sort();

// --- the tool set -----------------------------------------------------------
assert.deepStrictEqual(names, [
  'check_dtc_eligibility',
  'get_benefit_status',
  'get_filing_status',
  'get_messages',
  'get_paid_status',
  'get_payments',
  'get_profile',
  'get_report_status',
  'mark_messages_read',
  'mark_payment_paid',
  'mark_taxes_filed',
  'submit_monthly_report',
], 'registered tool set changed');

for (const tool of tools) {
  assert.strictEqual(typeof tool.execute, 'function', `${tool.name} has no execute`);
  assert.strictEqual(tool.inputSchema.type, 'object', `${tool.name} schema is not an object`);
  assert.ok(tool.description && tool.description.length > 20, `${tool.name} needs a real description`);
}

// --- gating -----------------------------------------------------------------
const gated = tools.filter((t) => t.requiresConfirmation).map((t) => t.name).sort();
assert.deepStrictEqual(gated, ['mark_taxes_filed', 'submit_monthly_report'],
  'the confirmation-gated set changed -- both entries are filings, do not ungate them');

// --- credentials never become arguments -------------------------------------
const FORBIDDEN = ['sin', 'pin', 'password', 'bceid', 'phone'];
for (const tool of tools) {
  for (const prop of Object.keys(tool.inputSchema.properties || {})) {
    assert.ok(!FORBIDDEN.includes(prop.toLowerCase()),
      `${tool.name} takes "${prop}" as an argument -- credentials must not pass through a tool call`);
  }
}

// The PIN-setting route must have no tool at all.
assert.ok(!names.some((n) => /pin/i.test(n)), 'no tool may set the security PIN');
// Match a quoted request path, not the prose in the file header that explains
// why this endpoint is deliberately absent.
assert.ok(!/['"`]\/api\/profile\/pin/.test(source), 'webmcp.js must not call the PIN endpoint');

// submit_monthly_report must offer a dry run -- it is how an agent previews a filing.
assert.ok(byName.submit_monthly_report.inputSchema.properties.dryRun,
  'submit_monthly_report must keep its dryRun option');

console.log(`✓ webmcp: ${tools.length} tools, ${gated.length} confirmation-gated, no credential arguments`);
}

main().catch((err) => { console.error(err); process.exit(1); });
