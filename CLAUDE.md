# Talli

## Rules
- No emojis anywhere
- Live at talli.heyitsmejosh.com (renamed from tally.heyitsmejosh.com 2026-06-20 — repo, domain, and portfolio link all updated; old `tally` subdomain still resolves but is not the canonical link)
- Push to `main` auto-deploys to Vercel prod via `.github/workflows/deploy.yml` (VERCEL_TOKEN/ORG_ID/PROJECT_ID repo secrets) — no more manual `vercel --prod` needed
- Portfolio-vibe aesthetic (matches heyitsmejosh.com, see `portfolio-tokens.css`): Light (#ffffff bg / #1a1a1a text), Dark (#1a1a1a bg / #fff8f0 text)
- Accent: #5B9BD5 (blue), secondary #BFDDF0
- Fonts: DM Sans (body) + Fraunces (headings), Geist for code/mono — `web/landing.html` was found loading the old Space Grotesk font on 2026-06-20, fixed to match design tokens
- 430px max-width shell centered on desktop
- 640px max-width, single-column, text-first
- Theme toggle: sun/moon SVG, View Transitions API, `[data-theme="dark"]`
- 14px border-radius standard; glass/blur accents allowed on sticky/floating elements (toggle, banners)
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
- **Feature needed**: PWD Resubmit button on Status tab — one-click to pre-fill and resubmit the PWD application directly from Talli, without navigating BC Self-Serve.

## Reporting Period
- Window is days 1–5 of every month. That's when to file.
- Banner auto-shows on Home tab (web) and Dashboard (iOS) when day <= 5.
- StatusTab "Income report window" date is computed dynamically from current month, not hardcoded.
- Debt triage "clearable by X" label is also dynamic (next month's 1st).

## Changelog
- v3.5.2 (2026-06-22): Fixed Status tab crash — `Screen()` referenced `rdspStatus`/`cdbStatus`/etc. props it never received from `App()`, throwing a `ReferenceError` the instant the Status tab rendered (caught by the ErrorBoundary as "Something went wrong"); wired the props through `Screen` → `StatusTab`. Fixed slow login/data load — `/api/latest` blocked every request on a fresh ~30s live BC Self-Serve scrape before falling back to cache; `fetchOrLoadData` now serves cached Blob data immediately and refreshes live in the background (stale-while-revalidate), only blocking synchronously when no cache exists yet (first-ever login).
- v3.5.1 (2026-06-20): Submitted iOS App 1.0 (build 2.4.2/6) to App Store review. Added `web/privacy.html` (required for submission). Fixed live deploy pipeline — GitHub Actions only ran lint checks before, never deployed, so the font/footer fixes weren't reaching production; added auto-deploy job + Vercel secrets. Fixed `web/landing.html` still loading old Space Grotesk font + stale `nulljosh/apps` monorepo footer links. Renamed domain tally→talli.heyitsmejosh.com, updated portfolio card. Regenerated App Store screenshots at correct resolutions (iPhone 11 Pro Max / 14 Plus sims, not newest models — see project memory on App Store screenshot resolutions). Known issue: Xcode Cloud workflow still references old `Tally.xcodeproj` path, needs manual repoint in Manage Workflows.
- v3.5.0 (2026-06-01): Auto-detect monthly report submission status from BC Self-Serve. http-scraper now fetches `/Auth/MonthlyReports` as a section and `parseReportMonths()` derives filed months from the page (explicit per-period status + sequential inference from the open period — only marks periods literally shown, no fabrication). On each live scrape, `mergeScrapedReportMonths()` unions detected months into the `report-status` Blob (never deletes user-confirmed months), so the Home banner and Status "Reports Filed" list reflect filed-through state with no manual entry. Propagates to iOS/watchOS automatically via the shared `/api/report-status` endpoint. Parser unit tests added to `tools/test-http-scraper.js`.
- v3.4.1 (2026-05-29): i18n test suite (`tools/test-i18n.js`, wired into `npm test` + `test:i18n`). 11 tests: strings.json validity, generated web/native output drift checks, and the real `web/js/i18n.js` runtime loaded in a mocked-browser vm sandbox (t() en-fallback + Intl CAD currency/date/number formatting across en/fr/zh/pa). Caught fr-CA `$CA` currency suffix.
- v3.4.0 (2026-05-29): i18n pipeline. Master string source (`i18n/strings.json`) generates web i18next JSON (`web/locales/*.json`) + Xcode String Catalog (`ios/Talli/Localizable.xcstrings`) via `scripts/i18n-gen.mjs`. Vanilla runtime `web/js/i18n.js` with `Intl` CAD currency/date/number formatters + localStorage persistence + en fallback. DeepL fill (`scripts/i18n-mt.mjs`) skips `review:true` finance/benefit strings. Locales en/fr full, zh/pa generic UI. unified.html loads the runtime; JSX literal retrofit + native SwiftUI wiring are the next step.
- v3.3.0 (2026-05-28): Banner correctness (suppresses when already filed, shows "Filed" confirmation), "File now" button in banner, auto-scrape on mount days 1-5 (localStorage-gated 6h), calendar days 1-5 highlighted + legend entry, iOS report-filed state wired to AppState, watchOS filing window indicator, iOS "Filed" banner.
- v3.2.0 (2026-05-28): Dynamic reporting window dates (no more hardcoded "Jun 1–5"), filing period banner on web + iOS when days 1–5, fixed ReportView timing copy and nextDeadline logic.
- v1.0.0 (2026-05-22): History reset. BC Self-Serve scraper with session-encrypted credentials, payment amount tracking, PWD application timeline, messages sync, Vercel Blob persistence, iOS + watchOS companion apps.

## Imported from Talli.pdf (2026-06-21)
- [ ] Web login issue — could not reproduce; no real BC Self-Serve creds available in this environment, no error logs found. Likely fine or an intermittent portal outage (already handled distinctly in code).
- [ ] macOS App Store Connect app record — doesn't exist yet for `com.heyitsmejosh.tally.mac`; `fastlane mac_beta` builds clean but upload fails until the record is created manually in ASC (same flow used to fix Epiphany macOS — see epiphany/CLAUDE.md).
