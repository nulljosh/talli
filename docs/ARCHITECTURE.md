# Architecture

Talli is a Canadian disability benefits navigator. Users scrape their BC Self-Serve portal account, learn about available benefits (PWD, RDSP, CDB), and file monthly income reports directly from the app. Web dashboard (html/js), native iOS/macOS apps, watchOS companion, Kotlin Multiplatform Android stub, Cloudflare Workers backend scraper. Cross-platform state synced via /api endpoints backed by Workers KV and Supabase.

## How it runs

1. **Web entry**: `web/landing.html` is public. Login at `web/login.html` triggers OAuth or credential entry. Successful auth redirects to `web/unified.html` (the dashboard).
2. **Dashboard fetch**: On load, `/api/latest` hits the backend, which runs `src/http-scraper.js` against live BC Self-Serve, parses portal data, caches it in KV, and returns to the client. Stale-while-revalidate pattern: cached data served immediately, live scrape happens in background.
3. **Mobile apps**: iOS/macOS apps call the same API endpoints, store auth in Keychain, persist dashboard data locally, and sync state across phone/computer via shared `/api` endpoints.
4. **Native Android**: KMP shared code + Android-specific UI via Compose (stub, not yet published).
5. **watchOS companion**: Simplified views showing payment, messages, benefits. Reads from the same `/api/` endpoints as iOS.

## Web

### Pages

| File | What it owns |
|---|---|
| `web/landing.html` | Public marketing page. Hero, feature list, app links. Theme toggle, View Transitions API. |
| `web/login.html` | Sign-in form. Username/password OR OAuth redirect to BC. Theme toggle. Redirects to unified on success. |
| `web/unified.html` | Main dashboard. Tabbed shell: Home (payment info, messages, banners), Dashboard (benefits cards), Status (PWD/RDSP/CDB timelines, filed months, messages), Settings. Handles offline state, notification scheduling, theme. Lazy-loads tab content on tab switch. 1633 lines. |
| `web/screen.html` | Benefits eligibility screener. Multi-step questionnaire that guides user through questions (income, household, disability type) and outputs matched benefits. Saves answers to localStorage. |
| `web/dca.html` | Dollar-Cost Averaging calculator with Chart.js visualization. For RDSP investment planning. Standalone tool. |
| `web/lawyers.html` | Directory of disability lawyers in Canada. Filter by province/category. Reads from inline data. |
| `web/privacy.html` | Privacy policy. Static legal page. |
| `web/index.html` | Redirect to `/app` (landing page). Contains smart-banner meta tag for iOS app. |

### Styles & Design

| File | What it owns |
|---|---|
| `web/portfolio-tokens.css` | Jaybulb design system alias layer. Imports canonical heyitsmejosh.com/tokens.css, adds Talli-specific overrides (accent is blue #5B9BD5, not yellow). Theme toggle: light/dark via CSS variables and `[data-theme="dark"]`. |
| `web/design-tokens.css` | Duplicate design tokens (benefits page). Should consolidate into portfolio-tokens. |
| `web/css/styles.css` | Benefits page styling (main, card, list, form, responsive). |

### JavaScript & Utilities

| File | What it owns |
|---|---|
| `web/js/i18n.js` | Internationalization runtime. Loads locale JSON (en/fr/zh/pa), swaps [data-i18n] text, exposes Intl formatters for currency/date/number. No framework dependency. |
| `web/js/utils.js` | HTML escaping utility. |
| `web/js/dtc.js` | DTC Navigator. Loads questions from API, tracks answers, renders UI, shows results. ~474 lines. |
| `web/js/dispute.js` | PWD dispute wizard UI. Guides user through disputing a rejection (reason, description, internal review). |
| `web/js/webmcp.js` | WebMCP tool registration. Exposes benefit status, payments, messages to in-browser agents via document.modelContext. Calls existing Express API routes. |
| `web/sw.js` | Service worker. Static cache (landing, manifest, styles, icons), API cache for /api/* calls, offline fallback. Cache versioning via key suffix. Network-first for pages, cache-first for hashed assets. |

## Backend (src/ + worker/)

Core business logic: scraper, auth, session management, program schemas, data parsing, API routes.

| File | What it owns |
|---|---|
| `src/api.js` | Express app (2000+ lines). Routes all /api/* endpoints (login, check, latest, submit-report, paid-status, messages, etc.). Manages sessions (express-session + Upstash Redis), auth, CSRF. Loads program schemas, binds to Cloudflare KV. Serves static assets via `run_worker_first`. |
| `src/http-scraper.js` | Puppeteer scraper for BC Self-Serve portal. Logs in with credentials (BCeID relay chain), scrapes /Auth/Dashboard, /Auth/MonthlyReports, /Auth/Messages. Handles retries, timeouts, error states. Returns structured portal data (payment amount, next date, benefits, messages, report filing status). |
| `src/parse-messages.js` | Message extraction from scraped HTML. Handles portal's quirky text-node-only markup. Deduplicates, parses dates, counts. Returns message array [{ text, date }]. |
| `src/programs/` | Program-specific logic: PWD (Persons with Disabilities), RDSP (Registered Disability Savings Plan), CDB (Canada Disability Benefit). Each has profile endpoints (data structure), eligibility rules, status derivation. Generated routes via `registerProfileRoutes()`. |
| `src/scraper.js` | Puppeteer session manager, login orchestration, cache layer. Checks if scrape is already in-flight, returns existing promise (locks prevent duplicate concurrent scrapes). |
| `src/session-store.js` | Session storage abstraction. Upstash Redis wrapper for express-session (TTL-backed, serializable). Fallback in-memory store for local dev. |
| `src/pay-dates.js` | Hardcoded BC payment schedule (Wednesday cheque issue dates) and derived payday calculation. nextPaymentDate() looks up schedule. |
| `src/school-grades.js` | Loads cached school grades from disk (for future feature). |
| `src/_blob.js` | KV storage abstraction. Wraps Cloudflare Workers KV. Stores dashboard cache, report-status, paid-months, avatar, messages. |
| `worker/index.mjs` | Cloudflare Workers entry. Wraps Express app via httpServerHandler. |
| `worker/bindings.mjs` | Global bindings: ASSETS (static files), BLOB (KV namespace). |

## iOS

### App Shell

| File | What it owns |
|---|---|
| `ios/TallyApp.swift` | Main app entry. Instantiates AppState, wraps in environment, sets theme preference. |
| `ios/ContentView.swift` | Root UI shell (559 lines). AuthenticatedTabShell vs LoginScreen. Tab switching, splash screen, offline/stale banners. TabView with Dashboard, Settings, Reports. |

### State & API

| File | What it owns |
|---|---|
| `ios/Models/AppState.swift` | Observable state container (597 lines). Holds dashboard data, auth, UI state, messages, paid months. Loads/refreshes from API. Local auth via Biometric + Keychain. Avatar generation. Report status tracking. |
| `ios/API/APIClient.swift` | HTTP client for calling /api/* endpoints (278 lines). Handles login, sessionCheck, latest, check, submitReport, messages, reportStatus. Error mapping (unauthorized → logout, 429 → rate-limited). JSON decoder with snake_case conversion and ISO8601 dates. |
| `ios/Models/Dashboard.swift` | Top-level dashboard shape from API: income, nextPaymentDate, benefitType, status, messages, tableData. |
| `ios/Models/DashboardData.swift` | Structured dashboard response (92 lines). StatusMessage, Income per program, CodingKeys for parsing. |
| `ios/Models/Report.swift` + `ReportSubmission.swift` | Report filing shapes. Report (id, month, status, submittedDate). ReportSubmissionRequest/Response for the /api/submit-report call. |
| `ios/KeychainHelper.swift` | Secure storage for credentials (username/password), report secrets (SIN/PIN/phone). Uses Security framework. Supports biometric unlock via LocalAuthentication. |
| `ios/Helpers/DateParsing.swift` | Flexible date parser. Tries multiple formats (ISO8601, space-separated, etc.). Handles portal's inconsistent date strings. |
| `ios/Helpers/PersonalInfo.swift` | SIN/phone/PIN formatting and validation. digitsOnly() filters, formatPhone() does (XXX) XXX-XXXX, isComplete() checks a property. |
| `ios/Notifications/PaydayNotificationScheduler.swift` | Local notifications (UNCalendarNotificationTrigger). Schedules payday reminder and reporting-window banner (days 1-5). No APNs. |

### UI Views

| File | What it owns |
|---|---|
| `ios/Views/` | Directory of view files: ContentView (shell), DashboardView, ReportView, SettingsView, MessagesView, PaymentCalendarView, BenefitsView, AvatarView, SplashView, WhatsNewSheet. Each is a self-contained SwiftUI module with local @State or @Environment binding. |
| `ios/Views/AppTheme.swift` | Color extensions (appleBlue, talliBlue, gradeRed). Hex color init. sectionLabel view modifier. |
| `ios/View+Glass.swift` | liquidGlass modifier. Floating glass cards on iOS 26+, fallback material on older iOS. |

### Tests & Screenshots

| File | What it owns |
|---|---|
| `ios/Tests/TallyTests.swift` | Unit tests: DateParsingTests (multiple date formats), DashboardDataDecodingTests (JSON shape resilience). |
| `ios/Tests/test_payday_dates.swift` | Standalone self-check for date math (run via `swift ios/Tests/test_payday_dates.swift`). |
| `ios/UITests/PreviewScreenshot.swift` | Snapshot tests for App Store screenshots. Uses fastlane snapshot. |
| `ios/UITests/SnapshotHelper.swift` | Snapshot infrastructure (auto-generated by fastlane). |
| `ios/ci_scripts/ci_post_clone.sh` | Xcode Cloud post-clone hook. Disables SPM fingerprint validation so SwiftLint plugin runs. |
| `ios/scripts/` | Helper scripts: simplify.sh (ensures standard folder structure), update_screenshots.sh (runs fastlane snapshot, xcodegen). |

## iOS Widgets

| File | What it owns |
|---|---|
| `widgets-ios/TallyWidgets.swift` | Widget bundle entry. Declares PaymentWidget, BenefitsWidget, MessagesWidget. |
| `widgets-ios/Models/` | WidgetAPI (fetches summary from /api/summary), WidgetModels (TalliSummary shape with payment/counts/lastUpdated, mirrors backend shape). |
| `widgets-ios/Providers/` | TimelineProvider implementations for each widget. fetch async, cache locally in UserDefaults (suiteName="group.com.heyitsmejosh.tally" for app-group data sharing). |
| `widgets-ios/Views/` | Widget UI: BenefitsWidget (grid of active benefits + status), MessagesWidget (count + latest message), PaymentWidget (next payment date + amount). Each renders an Entry via View. |

## macOS

iOS structure ported to macOS. Separate App State, Models, API client, Keychain (macOS variant), Views. Widgets similarly ported.

| File | What it owns |
|---|---|
| `macos/TalliMacApp.swift` | App entry, menu bar + window, theme preference. |
| `macos/Models/MacAppState.swift` | macOS state container (281 lines). Dashboard cache, sync date, auth, app-group defaults for widget sharing. |
| `macos/Models/MacAPIClient.swift` | HTTP client (178 lines). Simpler than iOS (no biometric, no rich status codes). |
| `macos/Models/MacKeychainHelper.swift` | Keychain access (64 lines, macOS variant). |
| `macos/Models/MacDateParsing.swift` + `MacDashboardData.swift` | macOS versions of date parsing and data shapes. |
| `macos/Views/` | 10 view files: MacContentView (shell), MacDashboardView, MacLoginView, MacMessagesView, MacPaymentCalendarView, MacSettingsView, MacBenefitsView, MacTheme, MenuBarView. Responsive layout for larger screens. |
| `macos/UITests-mac/MacScreenshot.swift` | Snapshot test for macOS. |
| `widgets-macos/` | Widget bundle + providers/views. Mirrors iOS widgets but macOS-specific styling. |

## watchOS

Minimal UI: three glances (payment, benefits, messages). Read-only companion to iOS/macOS. Fetches from same API.

| File | What it owns |
|---|---|
| `watchos/TallyWatchApp.swift` | App entry. |
| `watchos/ContentView.swift` | Root TabView (vertical page navigation). Tabs: PaymentGlance, BenefitsView, MessagesView. |
| `watchos/Models/WatchAPI.swift` | HTTP client. Fetches `/api/summary`. Caches locally. |
| `watchos/Models/WatchModels.swift` | TalliSummary, TalliMessage shapes. |
| `watchos/Views/` | PaymentGlance (next payment + amount, calendar), BenefitsView (status grid), MessagesView (message list with timestamps). |

## Kotlin Multiplatform (Android stub)

| File | What it owns |
|---|---|
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/talli/` | Shared code: Models.kt (data shapes), TalliApi.kt (HTTP client via Ktor, mirrors backend shapes). |
| `kmp/shared/src/commonTest/kotlin/` | DashboardParserTest. Tests shared model decoding. |
| `kmp/composeApp/src/androidMain/kotlin/` | MainActivity. Android entry, sets content. |
| `kmp/composeApp/src/commonMain/kotlin/` | App.kt (307 lines). Shared UI in Compose. Not yet fully featured (stub). |
| `kmp/composeApp/src/desktopMain/kotlin/` | Desktop test app (Main.kt). |

## Tools & Scripts

Test suite covering scraper, parsing, date logic, session store, payment dates, message parsing, read-messages, paid-status, program schemas, i18n, auth, Stripe webhooks, WebMCP. Tools include:

| File | What it owns |
|---|---|
| `tools/test.js` | Main test runner. Checks scraper sections, portal data freshness, parsing correctness. |
| `tools/test-*.js` | Individual test files: http-scraper (portal parse), messages (extraction), pay-dates (schedule verification), program-schema (routes), paid-status (monthly paid months format), session-store (Redis), i18n (string validity), stripe-webhook (Stripe event handling), webmcp (tool registration), response-split (Content-Length bug), school-grades (file loading), scrape-lock (concurrency guard), read-messages (read-state persistence). |
| `tools/native-decode-check/` | Swift cross-check: both native clients shipped shape-mismatch bugs (Workers truncated by 1 byte, macOS had wrong field names). This standalone check decodes the payload natively to catch future drift. |
| `tools/school/fill_pdf.py` | Biology 12 fill-in-the-blank PDF filler. Finds blanks, matches them to answer key using Claude. |
| `tools/dtc_apply.py` | T2201/DTC application helper (file -> CSV). |

## Build & Deploy

| File | What it owns |
|---|---|
| `project.yml` | iOS xcodegen config (targets: app + widgets). |
| `Package.swift` | watchOS Package manifest (not shown in digest, but present). |
| `package.json` | npm scripts: `npm start` (local dev on port 3000), `npm run check` (run scraper), `npm run deploy` (wrangler pages deploy), `npm test` (run test suite), `npm run upload-blob` (upload to Vercel Blob). |
| `wrangler.jsonc` | Cloudflare Workers config. Binds KV (BLOB), static assets (ASSETS). `run_worker_first` for all routes. |

## Storage & Sync

- **KV (Cloudflare Workers)**: Dashboard cache (per user), report-status (filed months), paid-months (history), avatars (generated node graphs), messages read-state
- **Keychain**: Credentials (username, password), report secrets (SIN, PIN, phone)
- **UserDefaults (iOS/macOS)**: Theme preference, last sync date, paid status (pre-migration data), app-group shared defaults for widget access
- **Widget App Group**: Shared UserDefaults (group.com.heyitsmejosh.talli) for widget↔app data sync

## Key Gotchas & Design Decisions

- **No authentication token in code**: Sessions are server-side and cookie-based. Portal credentials never leave the server (stored encrypted in KV). Clients hold only session cookies via URLSession.
- **Portal scraper**: Puppeteer-based on BC Self-Serve HTML. Inherently fragile to UI changes. Test suite (`tools/test.js`) validates freshness weekly.
- **Stale-while-revalidate**: API serves cached data immediately, refreshes in background. Prevents UI hang on slow portal scrapes (~30s).
- **App Group sharing**: iOS app + widgets share data via UserDefaults(suiteName: "group.com.heyitsmejosh.talli"). macOS uses the same pattern. watchOS reads from API only (no local sync).
- **Date parsing**: Portal returns inconsistent date formats. DateParsing.swift/MacDateParsing.swift handle multiple patterns with fallbacks.
- **Reporting window**: Days 1-5 every month. Banner auto-shows, auto-scrapes (6h gate via localStorage), fields auto-populate. Deadline is hardcoded (not computed) due to ministry extension.
- **Design system sync**: web/portfolio-tokens.css imports canonical heyitsmejosh.com/tokens.css live (no copy-paste drift). Talli adds only the blue accent override.
- **Widgets on iOS/macOS**: Share the same TimelineProvider pattern but fetch independently (no shared state, each polls the same API endpoint).
- **KMP Android**: Stub. Shared code is in place (Models, API client); UI (Compose) not yet feature-complete.

## Security Notes

- Portal credentials encrypted before KV storage (handled by scraper, not shown in digest).
- CSRF protection on all session-modifying routes (/api/submit-report, etc.).
- No raw setInterval for API polling; use visibilityInterval() helper (pauses when tab hidden to save Vercel invocations).
- Biometric unlock on iOS (LocalAuthentication framework) + Keychain fallback.
- Stripe webhook validation (webhook signature checked before processing).
