# Talli API

Base URL: `https://talli.heyitsmejosh.com`

An Express app (`src/api.js`) deployed as a Vercel Node function. It scrapes the
BC self-serve portal on the user's behalf and caches results per user. Responses
are JSON; errors are `{ "error": "message" }` with the matching status.

## Authentication

Server-side sessions (`express-session`) over a cookie. BCeID credentials are
encrypted at rest and never returned by any endpoint.

```bash
curl -c jar.txt -X POST https://talli.heyitsmejosh.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"…","password":"…"}'

curl -b jar.txt https://talli.heyitsmejosh.com/api/summary
```

From the browser, `fetch(url, { credentials: 'same-origin' })` is enough. Routes
marked **auth** return `401` without a session.

Note the CSP in `vercel.json`: `script-src 'self' 'unsafe-inline'` plus
`unpkg.com` and `cdn.jsdelivr.net` only. Same-origin scripts are fine; other
CDNs are blocked.

## Session and account

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/login` | POST | — | `{username, password}` BCeID |
| `/api/logout` | POST | — | Clears the session |
| `/api/session-check` | GET | — | Whether the session is still valid |
| `/api/me` | GET | — | Current user, or signed-out |
| `/api/profile` | GET | auth | Avatar URL and service card number |
| `/api/profile/pin` | POST | auth | Stores the encrypted portal PIN. **No WebMCP tool** — see below |
| `/api/avatar` | GET, POST | auth | Avatar image |

## Benefits and payments

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/summary` | GET | — | Benefit summary: amounts, next payment, requirements |
| `/api/latest` | GET | auth | Latest scraped payments, messages and notifications |
| `/api/check` | GET | auth | Triggers a fresh scrape of the portal |
| `/api/status` | GET | auth | Scrape/job status |
| `/api/paid-status` | GET, POST | auth | POST `{month: "YYYY-MM", paid: bool}`. Local bookkeeping only |
| `/api/report-status` | GET, POST | auth | Which months a report has been submitted for |
| `/api/read-messages` | GET, POST | auth | POST `{readIds: []}` — additive, never marks unread |
| `/api/submit-report` | POST | auth | **Files the monthly report with the ministry.** Body accepts `{dryRun}`; `sin`/`phone`/`pin` are optional overrides, and the PIN falls back to the encrypted one in the user's profile. Rate limited |
| `/api/mobile` | GET | auth | Compact payload for the iOS/macOS apps |
| `/api/debug-payment` | GET | auth | Diagnostic |

## CRA and tax credits

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/cra/summary` | GET | auth | CRA account summary |
| `/api/cra/connect` | POST | auth | Link a CRA account |
| `/api/cra/disconnect` | POST | auth | Unlink |
| `/api/cra/filing-status` | GET, POST | auth | POST `{filedYears: ["2024"]}` — **replaces the whole list** |
| `/api/cra/dtc/prepare` | POST | auth | Prepare a Disability Tax Credit application |
| `/api/dtc/screen` | POST | — | DTC eligibility screener. Advisory, files nothing, needs no sign-in |

## Billing, legal, meta

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/stripe-status` | GET | auth | Subscription state |
| `/api/stripe-checkout` | POST | auth | Creates a Checkout session |
| `/api/stripe-webhook` | POST | — | Signature-verified. Not for client use |
| `/api/legal` | POST | auth | Submit a legal-assistance description |
| `/api/health` | GET | — | Liveness |
| `/api/info`, `/api` | GET | auth | Route metadata |

Pages: `/` landing, `/app` the signed-in app, `/screen` the public DTC screener.

## WebMCP

With the app open, talli registers tools on `document.modelContext`.
Source: `web/js/webmcp.js`. Every tool calls the API above with the session
cookie — there is no separate data path.

### Read-only

| Tool | Does |
|---|---|
| `get_benefit_status` | Benefit summary: amounts, next payment, requirements |
| `get_payments` | Latest scraped payments and notifications |
| `get_paid_status` | Which months are marked received |
| `get_report_status` | Which months have a submitted report |
| `get_messages` | Which portal messages are marked read |
| `get_filing_status` | Which tax years are marked filed |
| `get_profile` | Avatar and service card number. Never credentials |
| `check_dtc_eligibility` | Runs the DTC screener. Advisory only, no sign-in needed |

### Reversible writes

| Tool | Does |
|---|---|
| `mark_payment_paid` | Marks a month received, or clears it. Local bookkeeping — the ministry is not told |
| `mark_messages_read` | Marks messages read. Additive only |

### Requires human confirmation

| Tool | Does |
|---|---|
| `submit_monthly_report` | **Files a real monthly report with the ministry** under the user's BCeID. Supports `dryRun` to preview without filing |
| `mark_taxes_filed` | Replaces the filed-years list — the record of what was filed |

### Credentials never pass through a tool call

Two deliberate omissions, enforced by `tools/test-webmcp.js`:

- **No tool sets the security PIN.** `POST /api/profile/pin` exists, but an agent
  choosing someone's PIN is not a feature.
- **`submit_monthly_report` takes no `sin`, `phone` or `pin` argument**, even
  though the route accepts them. The route already falls back to the encrypted
  PIN in the user's profile blob, so the credential never has to enter an agent's
  context.

The test asserts the exact tool set, that only those two filings are
confirmation-gated, and that no tool's input schema contains a credential-shaped
argument. It runs first in `npm test`, so a regression fails the suite loudly
rather than shipping quietly.
