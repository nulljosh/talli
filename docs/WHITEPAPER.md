# Talli Technical Whitepaper

**v4.0** | October 2026

When does the money come, and how much?

BC Self-Serve buries that answer in a slow portal built for caseworkers. Talli puts it on one screen for people on
BC disability assistance: the next payment, big, and the day it lands. It also follows PWD, RDSP and CDB, lists the
next paydays, and keeps the Ministry's messages in one inbox. Free. Web at
[talli.jaybulb.com](https://talli.jaybulb.com), plus iPhone, Mac and Apple Watch.

## Core mechanic: read Self-Serve like a browser

Self-Serve has no public API. `src/http-scraper.js` signs in with the person's BCeID using plain HTTP requests, no headless browser, walks the
portal, and turns payments, messages and application status into JSON. The password is encrypted with AES-256 and a
fresh IV each time and is never written in the clear. The SIN is masked on every screen. BCeID locks after a few
wrong passwords, so a failed sign-in is never retried.

The payment date does not depend on the scrape. `src/pay-dates.js` holds BC's published cheque issue dates, checked
against gov.bc.ca, and every client copy is tested against it (`tools/test-pay-schedule-sync.js`). So the date is
right even offline, and the `talli` CLI can show it with no account at all.

## What sits on top

- **Home**: the next amount in SF Pro Rounded bold, proportional figures, 56 points at most. It breathes slowly,
  unless Reduce Motion is on. Under it: "tomorrow" or "in 18 days", Mark as paid, and a compact payday card with
  the month and the next three cheque days. Totals fold under Details; money entry lives in Status.
- **Status**: PWD and CDB count as approved by default, with no button to press. The tools open as rows: a budget
  set against paydays, a benefit finder, RDSP grants, what a job would do to the cheque, and more.
- **Messages**: read state lives in Workers KV, so a message read on the phone is read on the Mac too.
- **Report window**: days 1 to 5 of each month show the monthly report banner, because missing it costs money.

## Architecture

- **Web**: no build step. `web/unified.html` is the dashboard (React from a CDN, inline JSX), `web/landing.html`
  the public page. Polling goes through `visibilityInterval()`, which stops when the tab is hidden.
- **Server**: an Express app (`src/api.js`) running on Cloudflare Workers (`worker/index.mjs`), with Workers KV
  for sessions, paid months and read state. Deploy is `npm run deploy`; a git push deploys nothing.
- **Native**: SwiftUI on iOS 17 and macOS 14 and up, Liquid Glass on 26. Four tabs everywhere: Home, Status, Messages and
  Settings (a glass nav bar on Mac). `HeroAmountView` draws the amount on both.
- **Terminal**: `bin/talli.js`, no dependencies. It keeps only a read-only widget token, never the password.
- **Languages**: one master string file builds the web bundle and the Xcode String Catalog in English, French,
  Chinese and Punjabi.

## Privacy

No ads, no trackers. The only outside calls are to BC Self-Serve. The pages count visits with Cloudflare Web
Analytics, which sets no cookies. People on assistance already have the Ministry watching their money; Talli does
not add anyone to that list.

## Tests

`npm test` runs about forty small Node checks in CI: the scraper against saved portal pages, the message parser,
the pay schedule, the font files, the CLI, Stripe webhooks and the program rules. The Mac and iPhone screenshot tests
shoot every tab in light and dark.

---

Apache License 2.0. Copyright 2026 Joshua Trommel.
