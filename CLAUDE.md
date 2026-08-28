# Talli

v3.5.12 (iOS, live) · v3.5.6 (macOS, live) — Personal finance tracker.

## Rules
- No emojis anywhere
- Live at talli.heyitsmejosh.com (renamed from tally.heyitsmejosh.com 2026-06-20 — repo, domain, and portfolio link all updated; old `tally` subdomain still resolves but is not the canonical link)
- Runs on Cloudflare Workers as of 2026-08-28 (`wrangler.jsonc`, `worker/index.mjs`). Deploy with `npm run deploy` — **a git push deploys nothing**; the Vercel GitHub Action was removed with `vercel.json`.
- `src/_blob.js` is the storage layer (Workers KV), not `@vercel/blob`. `web/` is served by the assets binding; only `/` is `run_worker_first`.
- Jaybulb design system: `web/portfolio-tokens.css` @imports the canonical https://heyitsmejosh.com/tokens.css and adds ONLY an alias layer for names canonical lacks. Never re-declare a colour the system owns in a page's own `:root` -- that shadows the system and is the drift bug fixed 2026-08-28.
- Accent comes from the system (currently bulb #ffca30), not from this file. Text on the accent must be #000; accent-as-text uses `--bulb-deep` (the accessible yellow), never raw `--accent`.
- Fonts: system SF Pro / Helvetica stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica`) — no webfonts. Backgrounds pure white (#ffffff), matching other projects.
- 430px max-width shell centered on desktop
- 640px max-width, single-column, text-first
- Theme toggle: sun/moon SVG, View Transitions API, `[data-theme="dark"]`
- 14px border-radius standard; glass/blur accents allowed on sticky/floating elements (toggle, banners). NOTE: this predates the canonical system, which is square (`--radius*: 0`) with no shadows. landing.html/login.html still hardcode 16 radii + 3 shadows -- unresolved, see roadmap.
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
- v3.5.8 (2026-07-22): Fixed What's New sheet bottom clipping — `presentationDetents` was sized from GeometryReader content height alone, missing the home-indicator safe-area inset the sheet still reserves, so the "Got it" button got cut off. SUBMITTED for review (submission 66a27d56) same night, build 202607221915.
- v3.5.7 (2026-07-21 night): iOS SUBMITTED for review — fixed `ios/project.yml` `MARKETING_VERSION` stuck at stale "3.5.5" (3.5.6 had already shipped/closed, Apple rejected the version-mismatch build). Also fixed a real Mac-side bug: the widget App-Group fix build had been uploaded to the wrong ASC app record (iOS's app ID used instead of Mac's) by a prior session's manual resume command — re-uploaded the same pkg to the correct Mac app, no rebuild needed. Apple's age-rating declaration also gained new required `socialMedia`/`socialMediaAgeRestricted` fields that blocked submission until answered. See roadmap.md "2026-07-21 night" for full detail.
- v3.5.4 (2026-07-09): Finished the orange→blue rebrand that v3.5.3 left half-done. Recolored the tally-mark icon source (`icon.svg`, `ios/icon.svg`) from `#FF851B`/`#1a1612` (brown+orange) to `#5B9BD5`/`#1a1a1a` and regenerated all iOS raster assets: AppIcon (light/dark/tinted, 1024²) + LaunchIcon (400², transparent marks). The TestFlight/launch-screen orange icon was stale raster PNGs, not source. Hardened scraper: skip-nav / accessibility boilerplate ("Skip to main content", "Accessibility Statement", etc.) was leaking into iOS "Status Messages" and the Messages tab — moved the junk filter (`JUNK_RX`) into the shared `uniqueTrimmed` so it strips at every extraction path, not just the empty-body fallback. NOTE: icon only reaches TestFlight on next build upload.
- v3.5.3 (2026-07-01): Switched web accent from orange #FF851B to portfolio blue #5B9BD5 (unified, login, landing, privacy; warning/urgency pulses stay orange). Fixed false "Report filed this month" banner -- a June 22 scrape marked future month 2026-07 as filed; parseReportMonths now never marks periods after the current month (test added) and the bogus blob key was removed. Fixed header letter-avatar fallback -- profile.json pointed at a deleted avatar blob (June 22 refresh race); repointed to the newest surviving avatar and cleaned 4 orphans. Messages tab now refetches on every open plus pull-to-refresh. Fixed Xcode Cloud archive failure: @Sendable added to getTimeline completion in all three widget providers (Payment, Messages, Benefits -- the third was failing too but not in the email) and safeAreaInset(side:) typo in MessagesView.swift.
- v3.5.2 (2026-06-22): Fixed Status tab crash — `Screen()` referenced `rdspStatus`/`cdbStatus`/etc. props it never received from `App()`, throwing a `ReferenceError` the instant the Status tab rendered (caught by the ErrorBoundary as "Something went wrong"); wired the props through `Screen` → `StatusTab`. Fixed slow login/data load — `/api/latest` blocked every request on a fresh ~30s live BC Self-Serve scrape before falling back to cache; `fetchOrLoadData` now serves cached Blob data immediately and refreshes live in the background (stale-while-revalidate), only blocking synchronously when no cache exists yet (first-ever login).
- v3.5.1 (2026-06-20): Submitted iOS App 1.0 (build 2.4.2/6) to App Store review. Added `web/privacy.html` (required for submission). Fixed live deploy pipeline — GitHub Actions only ran lint checks before, never deployed, so the font/footer fixes weren't reaching production; added auto-deploy job + Vercel secrets. Fixed `web/landing.html` still loading old Space Grotesk font + stale `nulljosh/apps` monorepo footer links. Renamed domain tally→talli.heyitsmejosh.com, updated portfolio card. Regenerated App Store screenshots at correct resolutions (iPhone 11 Pro Max / 14 Plus sims, not newest models — see project memory on App Store screenshot resolutions). Known issue: Xcode Cloud workflow still references old `Tally.xcodeproj` path, needs manual repoint in Manage Workflows.
- v3.5.0 (2026-06-01): Auto-detect monthly report submission status from BC Self-Serve. http-scraper now fetches `/Auth/MonthlyReports` as a section and `parseReportMonths()` derives filed months from the page (explicit per-period status + sequential inference from the open period — only marks periods literally shown, no fabrication). On each live scrape, `mergeScrapedReportMonths()` unions detected months into the `report-status` Blob (never deletes user-confirmed months), so the Home banner and Status "Reports Filed" list reflect filed-through state with no manual entry. Propagates to iOS/watchOS automatically via the shared `/api/report-status` endpoint. Parser unit tests added to `tools/test-http-scraper.js`.
- v3.4.1 (2026-05-29): i18n test suite (`tools/test-i18n.js`, wired into `npm test` + `test:i18n`). 11 tests: strings.json validity, generated web/native output drift checks, and the real `web/js/i18n.js` runtime loaded in a mocked-browser vm sandbox (t() en-fallback + Intl CAD currency/date/number formatting across en/fr/zh/pa). Caught fr-CA `$CA` currency suffix.
- v3.4.0 (2026-05-29): i18n pipeline. Master string source (`i18n/strings.json`) generates web i18next JSON (`web/locales/*.json`) + Xcode String Catalog (`ios/Talli/Localizable.xcstrings`) via `scripts/i18n-gen.mjs`. Vanilla runtime `web/js/i18n.js` with `Intl` CAD currency/date/number formatters + localStorage persistence + en fallback. DeepL fill (`scripts/i18n-mt.mjs`) skips `review:true` finance/benefit strings. Locales en/fr full, zh/pa generic UI. unified.html loads the runtime; JSX literal retrofit + native SwiftUI wiring are the next step.
- v3.3.0 (2026-05-28): Banner correctness (suppresses when already filed, shows "Filed" confirmation), "File now" button in banner, auto-scrape on mount days 1-5 (localStorage-gated 6h), calendar days 1-5 highlighted + legend entry, iOS report-filed state wired to AppState, watchOS filing window indicator, iOS "Filed" banner.
- v3.2.0 (2026-05-28): Dynamic reporting window dates (no more hardcoded "Jun 1–5"), filing period banner on web + iOS when days 1–5, fixed ReportView timing copy and nextDeadline logic.
- v1.0.0 (2026-05-22): History reset. BC Self-Serve scraper with session-encrypted credentials, payment amount tracking, PWD application timeline, messages sync, Vercel Blob persistence, iOS + watchOS companion apps.

## Imported from Talli.pdf (2026-06-21)
- [x] Web login issue — **REPRODUCED 2026-08-09** using real creds from `.env`: `executeLogin()` in `src/http-scraper.js` ran clean end to end (homepage → BCeID relay chain → `postLogon.cgi` → `myselfserve.gov.bc.ca/Auth/Login`), logged in successfully, landed on `/Auth/Messages`. One transient 15s timeout ("This operation was aborted") occurred on the final `Auth/Login` relay hop — already handled by the existing retry logic (`fetchPage retry 1/2`), which recovered and completed the login on the next attempt. No auth failure reproduced; the retry path is doing its job. Not a bug — closing.
- [ ] macOS App Store Connect app record — doesn't exist yet for `com.heyitsmejosh.tally.mac`; `fastlane mac_beta` builds clean but upload fails until the record is created manually in ASC (same flow used to fix Epiphany macOS — see epiphany/CLAUDE.md).

## Roadmap (2026-07-18 nightly wrap)
- **Merge Talli Mac into Talli iOS**: Consolidate the two ASC app records (unify bundle ID from com.heyitsmejosh.talli.mac to com.heyitsmejosh.talli, same pattern as spark/books consolidation done tonight). Recolor Mac icon orange→blue to match iOS. Both icon sources are already correct in the repo; this follows the same hand-exported-PNG-drift bug pattern found in spark/portfolio/books where the PNG diverged from the SVG source.

## Merge progress (2026-07-21 night)
- [x] `macos/project.yml` bundle ID fixed: `com.heyitsmejosh.tally.mac` → `com.heyitsmejosh.tally` (main app + widgets targets), matching iOS.
- [x] **Real bug found and fixed**: `TalliWidgets` macOS entitlements declared App Group `group.com.jt.talli`, but the main app (and the actual Swift code reading it, `Models/MacAppState.swift:11`) uses `group.com.heyitsmejosh.tally` — a genuine mismatch that was silently breaking widget↔app data sharing on macOS, independent of tonight's merge work. Fixed in `project.yml`'s `TalliWidgets.entitlements.properties` (xcodegen regenerates the `.entitlements` file from this — editing the generated file directly doesn't stick).
- [x] Upload attempt #1 (before the App Group fix): failed with errors 90345 + 90348.
- [x] Upload attempt #2 (after the App Group fix): 90345 is **gone** — confirms the App Group mismatch was the real cause of that one. **90348 still persists.**
- [ ] **90348 needs the Apple validation email** — no detail text available via the public API or the authenticated `asc web` session either (checked both 2026-07-21). Not blindly guessable further; check trommatic@icloud.com for Apple's ITMS validation message, then resume: `asc builds upload --app 6782366555 --pkg ".asc/artifacts/TalliMacMerged2Export/Talli.pkg" --version "3.5.6" --build-number "<new>"`.
