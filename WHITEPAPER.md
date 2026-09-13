# Talli Technical Whitepaper

**v3.5.12 iOS / 3.5.6 macOS** | August 2026

When does the money come, and how much?

BC Self-Serve buries that answer behind a slow portal built for caseworkers,
not the people waiting on the payment. Talli answers it directly for people
on BC disability assistance. It reads BC Self-Serve, tracks income and
payment dates, follows PWD and DTC applications, and shows government
messages. Everything the Ministry makes you dig for, in one glance. Live at
[talli.heyitsmejosh.com](https://talli.heyitsmejosh.com), with an iOS companion
app and a watchOS complication.

## Core Mechanic: The Scraper

BC Self-Serve has no public API, so reading it at all means acting like a
browser. Talli's core is a Puppeteer scraper (`src/scraper.js`) that logs in
with the user's BCeID, navigates the portal, and extracts payments, messages,
account info, and application status into structured JSON. Credentials are
session-encrypted and never stored in plaintext, because a scraper that holds
a BCeID password is a bigger target than the portal it's reading; the SIN is
masked everywhere it renders for the same reason.

On top of the scrape:

- **Payment countdown**: next payment date with an "in X days" hero and an
  earning-rate figure (payment ÷ hours remaining), because a countdown answers
  the question the app exists for faster than a calendar date does.
- **Report window detection**: the monthly report filing banner auto-shows
  days 1–5 of each month, since missing that window has real consequences and
  the Ministry's own portal doesn't remind anyone; reports submit with a
  stored PIN so filing doesn't mean a second trip back to Self-Serve.
- **Application timelines**: PWD and DTC trackers with submission history,
  including hardcoded Ministry deadline overrides when extensions are granted,
  because a granted extension is a one-off exception the portal itself won't
  reflect and the deadline still has to show correctly.
- **Message sync**: read state loads on mount and persists on tap
  (Vercel Blob), so web and iOS agree on what's been seen, since a message
  read on one device but still flagged unread on another defeats the point of
  a shared inbox.

## Architecture

- **Frontend**: vanilla HTML/CSS/JS, no build step, because a dashboard this
  small doesn't need a framework to justify. `web/unified.html` is the
  authed dashboard; `web/landing.html` and `web/benefits.html` are public.
  430px centered shell, PWA with offline mode so a payment date is still
  visible without signal, dark mode auto-detect.
- **API**: Express (`src/api.js`) on Vercel serverless, auth, session
  handling, scrape orchestration.
- **Persistence**: Vercel Blob for paid/report status and message read state.
- **Polling**: all API polling goes through a `visibilityInterval()` helper
  that pauses when the tab is hidden, capping serverless invocation burn,
  since a backgrounded tab has no one watching for the data to refresh.
- **i18n**: one master string source generates both the web i18next bundle and
  the Xcode String Catalog (en, fr, zh, pa), because disability assistance
  reaches people who don't read English first, with `Intl` CAD currency/date
  formatting.

## Platforms

| Platform | Status |
|---|---|
| Web (PWA) | Live |
| iOS | v3.5.12 Live |
| macOS | v3.5.6 Live |
| watchOS | Bundled complication |

The iOS app matches the web visual language (parchment palette, orange accent,
pixel-art avatar generated with Core Graphics), because a payment tracker
should feel calm rather than urgent, and ships via
`asc workflow run ship-ios`.

## Security

- Scraper credentials encrypted per session; nothing written to disk in clear,
  since a compromised device shouldn't also hand over a BCeID login.
- SIN masked in all UI surfaces.
- No ads, no analytics, no third-party trackers, the only external calls are
  to BC Self-Serve itself, because the people using this app are already
  dealing with the Ministry watching their finances; Talli doesn't add
  another party to that list.
