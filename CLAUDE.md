# Tally

## Rules
- No emojis anywhere
- Warm parchment aesthetic: Light (#faf7f4 bg / #1a1612 text), Dark (#0d0c0b bg / #f2ede8 text)
- Accent: #FF851B (clrs.cc orange)
- Font: Space Grotesk (Google Fonts) + system fallback
- 430px max-width shell centered on desktop
- 640px max-width, single-column, text-first
- Theme toggle: sun/moon SVG, View Transitions API, `[data-theme="dark"]`
- No glass morphism, no noise texture, no gradients -- solid colors only
- Spring hover: `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Never use raw `setInterval` for API polling -- always use `visibilityInterval()` helper (pauses when tab hidden, prevents Vercel invocation burn)

## Run
```bash
npm install
npm start          # localhost:3000
npm run check      # run scraper
npm run upload-blob # upload to Vercel Blob
```

## Key Files
- `src/api.js` -- Express API, auth, session handling
- `src/scraper.js` -- Puppeteer BC Self-Serve scraper
- `web/landing.html` -- public landing page
- `web/unified.html` -- dashboard (auth required)
- `web/benefits.html` -- benefits guide (disability, general BC/Canada, retirement)
- `tools/dtc_apply.py` -- T2201/DTC helper

## PWD Roadmap (Joshua's account — updated 2026-05-25)
- PWD application denied May 2026. **Extension granted 2026-05-25 by Ministry.**
- Hard deadline: **June 18, 2026** — no further extensions. Submit via fax 1-855-771-8784 or MYSS.
- Deadline is hardcoded in unified.html (not computed from denial date) since the extension overrides the standard 20-business-day window.
- **Feature needed**: PWD Resubmit button on Status tab — one-click to pre-fill and resubmit the PWD application directly from Tally, without navigating BC Self-Serve.

## Reporting Period
- Window is days 1–5 of every month. That's when to file.
- Banner auto-shows on Home tab (web) and Dashboard (iOS) when day <= 5.
- StatusTab "Income report window" date is computed dynamically from current month, not hardcoded.
- Debt triage "clearable by X" label is also dynamic (next month's 1st).

## Changelog
- v3.4.0 (2026-05-29): i18n pipeline. Master string source (`i18n/strings.json`) generates web i18next JSON (`web/locales/*.json`) + Xcode String Catalog (`ios/Tally/Localizable.xcstrings`) via `scripts/i18n-gen.mjs`. Vanilla runtime `web/js/i18n.js` with `Intl` CAD currency/date/number formatters + localStorage persistence + en fallback. DeepL fill (`scripts/i18n-mt.mjs`) skips `review:true` finance/benefit strings. Locales en/fr full, zh/pa generic UI. unified.html loads the runtime; JSX literal retrofit + native SwiftUI wiring are the next step.
- v3.3.0 (2026-05-28): Banner correctness (suppresses when already filed, shows "Filed" confirmation), "File now" button in banner, auto-scrape on mount days 1-5 (localStorage-gated 6h), calendar days 1-5 highlighted + legend entry, iOS report-filed state wired to AppState, watchOS filing window indicator, iOS "Filed" banner.
- v3.2.0 (2026-05-28): Dynamic reporting window dates (no more hardcoded "Jun 1–5"), filing period banner on web + iOS when days 1–5, fixed ReportView timing copy and nextDeadline logic.
- v1.0.0 (2026-05-22): History reset. BC Self-Serve scraper with session-encrypted credentials, payment amount tracking, PWD application timeline, messages sync, Vercel Blob persistence, iOS + watchOS companion apps.
