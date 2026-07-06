# Talli Technical Whitepaper

**v3.5.3** | July 2026

Talli is a benefits dashboard for BC disability assistance. It scrapes BC
Self-Serve, tracks income and payment dates, monitors PWD/DTC application
status, and surfaces government messages — the data the Ministry makes you dig
for, in one glance. Live at
[talli.heyitsmejosh.com](https://talli.heyitsmejosh.com), with an iOS companion
app and a watchOS complication.

## Core Mechanic: The Scraper

BC Self-Serve has no public API. Talli's core is a Puppeteer scraper
(`src/scraper.js`) that logs in with the user's BCeID, navigates the portal,
and extracts payments, messages, account info, and application status into
structured JSON. Credentials are session-encrypted and never stored in
plaintext; the SIN is masked everywhere it renders.

On top of the scrape:

- **Payment countdown** — next payment date with an "in X days" hero and an
  earning-rate figure (payment ÷ hours remaining).
- **Report window detection** — the monthly report filing banner auto-shows
  days 1–5 of each month; reports submit with a stored PIN.
- **Application timelines** — PWD and DTC trackers with submission history,
  including hardcoded Ministry deadline overrides when extensions are granted.
- **Message sync** — read state loads on mount and persists on tap
  (Vercel Blob), so web and iOS agree on what's been seen.

## Architecture

- **Frontend**: vanilla HTML/CSS/JS, no build step. `web/unified.html` is the
  authed dashboard; `web/landing.html` and `web/benefits.html` are public.
  430px centered shell, PWA with offline mode, dark mode auto-detect.
- **API**: Express (`src/api.js`) on Vercel serverless — auth, session
  handling, scrape orchestration.
- **Persistence**: Vercel Blob for paid/report status and message read state.
- **Polling**: all API polling goes through a `visibilityInterval()` helper
  that pauses when the tab is hidden, capping serverless invocation burn.
- **i18n**: one master string source generates both the web i18next bundle and
  the Xcode String Catalog (en, fr, zh, pa), with `Intl` CAD currency/date
  formatting.

## Platforms

| Platform | Status |
|---|---|
| Web (PWA) | Live |
| iOS | v3.5.1 Waiting for Review |
| watchOS | Bundled complication |

The iOS app matches the web visual language (parchment palette, orange accent,
pixel-art avatar generated with Core Graphics) and ships via
`asc workflow run ship-ios`.

## Security

- Scraper credentials encrypted per session; nothing written to disk in clear.
- SIN masked in all UI surfaces.
- No ads, no analytics, no third-party trackers — the only external calls are
  to BC Self-Serve itself.
