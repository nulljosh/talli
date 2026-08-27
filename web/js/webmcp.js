// WebMCP tool registration for Talli. Exposes benefit status, payments and
// messages to in-browser agents via document.modelContext.
//
// ponytail: every tool calls the existing Express API in src/api.js. The app is
// server-session-backed, so the API *is* the data layer -- there is no page
// state worth reaching into, and fetch() with the session cookie is the whole
// integration.
//
// Two deliberate omissions, both about credentials:
//   - No tool sets the security PIN (POST /api/profile/pin). An agent choosing
//     someone's PIN is not a feature.
//   - submit_monthly_report takes NO sin/phone/pin arguments even though the
//     route accepts them. The route already falls back to the encrypted PIN in
//     the user's profile blob, so the credential never has to enter an agent's
//     context. Do not add those arguments later.
(function () {
  const mc = document.modelContext;
  if (!mc?.registerTool) return; // browser without WebMCP support

  async function call(path, init) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || `${path} -> ${res.status}` };
    return data;
  }

  const post = (path, body) => call(path, { method: 'POST', body: JSON.stringify(body) });

  const MONTH = { type: 'string', description: 'Month as YYYY-MM' };

  const TOOLS = [
    // ---- read-only -------------------------------------------------------
    {
      name: 'get_benefit_status',
      description: 'Get the current benefit summary: assistance amounts, upcoming payment, and any outstanding requirements.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/summary'),
    },
    {
      name: 'get_payments',
      description: 'Get the latest scraped payment and notification data from the BC portal.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/latest'),
    },
    {
      name: 'get_paid_status',
      description: 'Get which months the user has marked as paid.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/paid-status'),
    },
    {
      name: 'get_report_status',
      description: 'Get which months the user has already submitted a monthly report for.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/report-status'),
    },
    {
      name: 'get_messages',
      description: 'Get which portal messages the user has marked read. Message contents come from get_payments.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/read-messages'),
    },
    {
      name: 'get_filing_status',
      description: 'Get which tax years the user has marked as filed.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/cra/filing-status'),
    },
    {
      name: 'get_profile',
      description: "Get the signed-in user's profile (avatar and service card number). Never returns credentials.",
      inputSchema: { type: 'object', properties: {} },
      execute: () => call('/api/profile'),
    },
    {
      name: 'check_dtc_eligibility',
      description: 'Run the Disability Tax Credit eligibility screener. Advisory only, does not file anything, and needs no sign-in.',
      inputSchema: {
        type: 'object',
        properties: {
          answers: { type: 'object', description: 'Screener answers, keyed by question id. See the screener at /screen for the question set.' },
        },
        required: ['answers'],
      },
      execute: ({ answers }) => post('/api/dtc/screen', { answers }),
    },

    // ---- reversible state changes ----------------------------------------
    {
      name: 'mark_payment_paid',
      description: "Mark a month's assistance payment as received, or clear that mark. Local bookkeeping only -- it does not tell the ministry anything.",
      inputSchema: {
        type: 'object',
        properties: {
          month: MONTH,
          paid: { type: 'boolean', description: 'true to mark received, false to clear' },
        },
        required: ['month', 'paid'],
      },
      execute: ({ month, paid }) => post('/api/paid-status', { month, paid }),
    },
    {
      name: 'mark_messages_read',
      description: 'Mark portal messages as read. Additive -- it never marks a message unread.',
      inputSchema: {
        type: 'object',
        properties: {
          readIds: { type: 'array', items: { type: 'string' }, description: 'Message ids to mark read' },
        },
        required: ['readIds'],
      },
      execute: ({ readIds }) => post('/api/read-messages', { readIds }),
    },

    // ---- consequential ----------------------------------------------------
    // Both of these are filings to a government body, or the record of one.
    {
      name: 'submit_monthly_report',
      description: 'Submit the monthly report to the BC self-serve portal. This files a real report with the ministry under the user\'s BCeID. Use dryRun first to see what would be submitted without filing.',
      requiresConfirmation: true,
      inputSchema: {
        type: 'object',
        properties: {
          dryRun: { type: 'boolean', description: 'true to walk the portal and report what would be submitted, without submitting' },
        },
      },
      // No sin/phone/pin here on purpose -- see the file header.
      execute: ({ dryRun } = {}) => post('/api/submit-report', { dryRun: !!dryRun }),
    },
    {
      name: 'mark_taxes_filed',
      description: 'Replace the list of tax years the user has marked filed. This overwrites the whole list, so include every year that should stay marked.',
      requiresConfirmation: true,
      inputSchema: {
        type: 'object',
        properties: {
          filedYears: { type: 'array', items: { type: 'string' }, description: 'Every four-digit year that should be marked filed, e.g. ["2024","2025"]' },
        },
        required: ['filedYears'],
      },
      execute: ({ filedYears }) => post('/api/cra/filing-status', { filedYears }),
    },
  ];

  (async () => {
    for (const tool of TOOLS) {
      try { await mc.registerTool(tool); }
      catch (err) { console.warn('[webmcp] failed to register', tool.name, err?.message); }
    }
  })();
})();
