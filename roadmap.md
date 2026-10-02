## Focus correction, 2026-09-11

Handoff: paused at Joshua's request to conserve usage. Changes are local and uncommitted; no deployment or release. Confirmation remains pending. Completed checks and next steps: [revenue handoff](../REVENUE.md).

Talli is a disability-tracking utility, not a revenue target (Joshua). Prioritize accurate tracking and usable reporting, not new monetization features. Existing checkout fixes remain reliability work: failed entitlement writes trigger retries, checkout errors are visible, and payment returns to the dashboard.

ASC verified today: iOS 3.5.14 and macOS 3.5.6 READY_FOR_DISTRIBUTION. Revenue work belongs to Epiphany and Voxprint. The old proposal to implement Talli password reset needs reassessment: the current login uses BCeID credentials, not a Talli-owned password.

# Talli Roadmap

## Next: 4.0 and 5.0 (planned 2026-10-02)

3.6.0 is in review on iPhone and Mac. Talli is free and stays free. The job is accuracy: what lands, when, and what you're allowed to earn.

### 4.0: the whole money picture
- [ ] Payday push without opening the app: a Workers Cron Trigger checks the portal and pushes new messages and the payday reminder (APNs key needed from Joshua).

### 6.0: never miss a dollar
- [ ] RDSP grant and bond tracker: what the government has matched, what's left this year, what carries forward.
- [ ] Supplements on the calendar: transportation, dietary, annual bus pass renewal, each with its own reminder.
- [ ] Missed-payment alert: payday passes and the portal shows nothing, Talli tells you who to call and what to say.

### 7.0: paperwork done for you
- [ ] Document vault: PWD decision letter, medical report, ID, leases. Encrypted, in iCloud, ready to attach.
- [ ] Message replies from Talli: answer a ministry message without opening My Self Serve.
- [ ] Service requests: start the common ones (crisis supplement, address change, shelter update) from the app.
- [ ] Reconsideration helper: denied? Walk the 20-business-day deadline with a checklist and a draft letter.

### 8.0: the whole household
- [ ] Couples and families: two-adult PWD rates, spouse earnings, dependants, shared exemption math.
- [ ] Trusted helper: share read-only access with a caseworker, advocate or family member, revocable any time.
- [ ] Rent and shelter: log rent changes, see the shelter maximum, flag when the shelter amount is wrong.

### 9.0: plan ahead
- [ ] What-if: "if I take this job at 20 hours a week", see the exemption, clawback and take-home month by month.
- [ ] Moving out of BC or turning 65: what changes (OAS/GIS hand-off), when, and what to file.
- [ ] Budget against real paydays: bills land on the calendar next to the money that pays them.

### 10.0: every province
- [ ] Alberta AISH and Ontario ODSP on the same profile engine; adding a province is a data file, not new code.
- [ ] Federal-only mode for anyone on CDB, GST credit and the Canada Dental Benefit without a provincial portal.
- [ ] Open data: publish the pay-date and rate tables as a free API other advocates can build on.

## Full cross-platform -- DONE 2026-08-31

Talli is now a real app on all six platforms: native iOS and macOS (Swift), a
Compose Multiplatform binary for Android, Windows and Linux (`kmp/`), and the web
app. The PWA install path still works but is no longer the story on the landing
page.

`kmp/shared` is the API layer -- a straight translation of `ios/API/APIClient.swift`
against the same `/api` contract, with `HttpCookies` standing in for URLSession's
shared cookie storage. `kmp/composeApp` is one Compose UI (login, dashboard,
benefits, messages, settings) shared by the APK and the jpackage desktop build.
`.github/workflows/build-native.yml` produces the MSI, DEB and APK, since jpackage
can only build an installer for the OS it runs on.

Deliberately left out:

## ASC state VERIFIED 2026-08-30

**iOS 3.5.13 is LIVE** (`READY_FOR_SALE`), macOS 3.5.6 LIVE. The 4.3(a) rejection was
resolved, 3.5.13 shipped. Talli needs no appeal; Curvely and Doorstock still do
(text at `~/Documents/Code/notes/appeal-4-3-spam.md`).

ITMS-90186/90062 email 2026-08-30 was a *delivery* error, not a review rejection: build 203
was uploaded into the already-approved 3.5.13 train. `MARKETING_VERSION` is now 3.5.14
(commit 0fa6b07). Do NOT archive/upload 3.5.14 until there is real content behind it, right
now it is a bare version bump.

## Email verification on signup + forgot-password flow

Talli's custom `/api/login` endpoint has no password-recovery or email-verification paths yet. Most other apps already have both. Implement: (1) password-reset route that emails a time-limited reset token, (2) token verification before allowing a new password, (3) optional email-verification on signup (soft gate, existing accounts grandfathered, login never blocked). See sparkjar's `/api/auth/verify-email.js` + `/api/auth/password-reset.js` for a reference implementation and the mail.js helper used by epiphany, sparkjar, and others.

## From Talli.pdf (imported 2026-07-28)

Source note: "messages regex still a mess / And it's not really updating accurately."
Four root causes found and fixed (see Status 2026-07-28 below); these are the leftovers.

## Lawyer directory -- v1 shipped 2026-09-04

`web/lawyers.html` + `web/data/lawyers.json`: free/low-cost BC legal help orgs
(Disability Alliance BC, CLAS, TRAC, Legal Aid BC, etc.), filterable by category.
Linked from the landing page footer. `web/js/legal.js` (the /api/legal analyzer,
currently unmounted -- no HTML wires its element IDs or loads the script) also
matches lawyers into its results for whenever that tab gets built.

## Local notifications shipped 2026-09-04

Built the "cheaper shape" the Stashed 2026-08-10 note below called for: `ios/Notifications/PaydayNotificationScheduler.swift`
uses `UNCalendarNotificationTrigger`, no APNs key, no device tokens, no server. Reschedules on every
`AppState.refreshDashboard()` (permission requested once via `requestAuthorizationIfNeeded`, silently
skips scheduling until granted). Two reminders: reporting-window-open (fires day 1 at 9am, or next
month's day 1 if today isn't day 1) and payday-tomorrow (9am the day before the next scraped payment
date). Pure date math lives in `nextReportingWindowFireDate`/`paydayReminderFireDate`, checked by
`ios/Tests/test_payday_dates.swift` (`swift ios/Tests/test_payday_dates.swift`, 6 assertions, excluded
from the app target same as `Tests/`) -- the first version of the window-date logic was inverted
(fired on day 1-5 instead of skipping to next month) and the check caught it before it shipped.

## Status (2026-08-10), Messages pagination + two bugs it exposed

Pagination shipped, and the roadmap's stated premise was wrong in a useful way.

**The mechanism is not ASP.NET.** The Messages page has no `<form>`, no `__VIEWSTATE`, no `__EVENTVALIDATION`. "Show More Messages" is `<button class="load-more">` wired to a jQuery handler doing `GET /Auth/Messages/MessageList?pageNumber=N`, which returns a bare HTML fragment of the next 10 rows. `parseAutoSubmitForm()` was not needed. `fetchMessagePages()` walks pages 2..N and merges new lines into the section's `allText`.

**The portal clamps past the last page** instead of returning an empty fragment: with 3 pages of data, `pageNumber=4,5,6…` all echo page 3 verbatim. Termination therefore keys off "this page contributed no new rows", never off an empty response, an empty-response check would spin to the page cap on every scrape. A fetch failure mid-walk ends the walk and keeps what was collected, rather than failing the whole section.

Two pre-existing bugs surfaced, both of which had to be fixed for pagination to work or to be worth having:

1. **`has_more_messages` had never once been true in production.** `extractSectionData` selects `li`, `p`, `div.*`, `main/article/section/h*`, `dt/dd`, and leaf `div[class]`/`span[class]`, but never `<button>`. The string "Show More Messages" therefore never reached `allText`, so `hasMoreMessages()` returned false on every real scrape and the portal always looked fully paginated. It only ever passed tests because the fixture supplied the button text as a literal line, the same "fixture asserts an impossible input shape" failure documented for the old parser on 2026-07-28. `<button>` text is now extracted.
2. **Real HTML produced 18 messages for 10 actual ones.** The portal nests the subject inside the row, so extraction emits both the whole row (`"2026 / AUG / 05 Monthly Report Reminder"`) and the inner `div.subject` alone. The dateless copy got a different dedupe key, survived as a separate message, and, because ids are content-hashed, showed on iOS as a permanently-unread duplicate. Dateless rows whose subject already appears dated are now dropped. Extracting `<button>` text also newly surfaced the session-timeout modal's "Yes, I'm still here" and the "Select a message to read" placeholder as fake messages; both are filtered, along with "Due to inactivity…" (which `BOILERPLATE_RX` missed because it leads with "Due").

Verified against the live portal with the real `.env` credentials, no interactive 2FA was required: **23 messages back to 2023-12-21, 0 dateless rows, walk terminated at page 4.** Previously 10 messages (18 rows with phantoms). `tools/test-message-pagination.js` (7 assertions) locks all of it, including the clamp; fixtures are synthetic because this repo is public and the real subjects are medical/benefit correspondence. Full `npm test` green.

## Status (2026-07-28), Messages parsing fixed

Four independent root causes behind "messages regex still a mess / not updating accurately":

1. **The mobile message parser never ran.** `extractMobileData()` split each entry on `\n` to separate date from subject, but every extraction path in `http-scraper.js` does `.text().replace(/\s+/g, ' ')`, an `allText` entry can never contain a newline. The date-parsing branch was unreachable, so every message shipped `timestamp: null` with the date glued to the front of the text, and bare date lines became their own bogus rows.
2. **Real messages were being silently dropped.** `NAV_SPAM_RX` ended in `\b`, so the `monthly reports?` nav-tab pattern also matched the subject "Monthly Report Reminder", the single most common message on the portal, filtering it out of both the list and the badge count. Nav labels are now full-line matches (plus optional badge digits).
3. **`/api/mobile` never refreshed anything.** It passes `allowLiveScrape: false` (correct, the portal's payment page hangs 60-90s and was timing the endpoint out), but `refreshLiveInBackground()` was *also* gated on that flag. So the iOS app served cached blob data and never triggered even the non-blocking background refresh. The flag now gates only the blocking path; added an `inFlightRefresh` guard so concurrent requests don't stampede the portal.
4. **The Messages tab stopped refetching on open.** v3.5.3 added refetch-on-open, but v2.4.3's custom `TalliFloatingTabBar` replaced the plain TabView, all tabs now stay alive, so `onAppear` only fires once. `ContentView`'s `onChange(of: selectedTabIndex)` now refreshes when tab 3 is selected.

Parsing moved into `src/parse-messages.js` (single source of truth for the list *and* both badge counts, which previously used three different date regexes). Handles `YYYY / MON / DD` with uppercase months and irregular spacing, the `!` action-required marker, ellipsis-truncated subjects, and date-keyed stable ids, the ids matter because iOS read-state keys off `message.id`, so unstable ids marked every message unread on every refresh.

`tools/test-parse-messages.js` (18 assertions) covers it with real portal strings. Note the old `tools/test-mobile-data.js` held a *copy* of the parser whose fixtures all contained `\n`, it asserted an impossible input shape, which is why a fully broken parser passed CI. It now imports the production parser instead of copying it. Full `npm test` green; iOS builds clean.

## Status (2026-07-27)
v3.5.11 (blue icon redesign) **SUBMITTED for review** 2026-07-27 23:18 UTC, submission `7c4b18ef-a587-4187-bfe4-3014af80dc43`, version `44fc6b9b-1957-46ba-ac02-ad73c0bfcc28`, build 202607262107. The 3.5.10 version-train block cleared (3.5.10 now READY_FOR_SALE), staging + submit ran clean.

Web: landing/login/unified/privacy/dca switched to pure white backgrounds and the system SF Pro / Helvetica stack (DM Sans + Fraunces webfonts dropped entirely) to match other projects.

## Status (2026-07-26)
iOS 3.5.8 was rejected/bounced by ASC (ITMS-90186/90062: version train closed, 3.5.8 already READY_FOR_SALE). Bumped to 3.5.9, archived/uploaded, created version, attached build, submitted for review (submissionId `32660788-1736-42da-8028-6ac5b8d7a89f`). **ACCEPTED**, review completed 2026-07-26 11:21 AM PDT, 3.5.9 now eligible for distribution/live. The build-128 Xcode Cloud failure email (ITMS-90478/90186/90062 on the abandoned 3.5.8 attempt) is stale noise from before the 3.5.9 fix, no action needed.

## Status (2026-07-21 night)
iOS 3.5.7 and Mac 3.5.6 both WAITING_FOR_REVIEW under the unified app `6782366555` (`com.heyitsmejosh.tally`), genuine one-app, two-platform merge, verified via `asc versions list`. Old standalone Mac app `6782661988` (`com.heyitsmejosh.tally.mac`) is a permanent dead end (Apple confirmed its bundle ID is immutable), orphaned, needs Joshua's manual ASC dashboard deletion, do not upload anything further to it.

`.env` exists now (gitignored) with real BC Self-Serve credentials for local testing.

## Ship 3.5.12, SUBMITTED 2026-07-28 night
Today's message-parser fix (94808a3) was committed+pushed but not in any build. Bumped
`ios/project.yml` MARKETING_VERSION 3.5.10 → 3.5.12, regenerated project, added
`-allowProvisioningUpdates` to both archive and export steps in `.asc/workflow.json`.
`asc workflow run ship-ios` archived+exported+uploaded clean (build 202607282147), but the
`publish` step failed since ExportOptions.plist uses `destination: upload`, export already
uploads directly to ASC, so there's no local .ipa for `asc publish appstore --ipa` to find.
Worked around manually: `asc builds wait` for the build to go VALID, `asc versions create`
(3.5.12, copied metadata from 3.5.11), `asc versions attach-build`, `asc review submit --confirm`.
Submission `8f3f038e-0f54-4751-96ec-aa1aa22dfe33`, build `be5d4b36-b481-496d-8e94-0f8afdcdafd8`.
**Follow-up**: `.asc/workflow.json`'s `publish` step is broken for this repo's export config , 
either switch ExportOptions.plist destination to `export` (produce a local .ipa) or replace the
publish step with the versions-create/attach-build/review-submit sequence used here.

## Status (2026-08-02), Bennies dashboard + i18n pipeline

Added a new Bennies dashboard tab that consolidates disability benefit tracking: DTC/PWD/CDB benefit status cards, monthly total ($1,650), debt payoff plan targeting $6k with August backpay button, and a checklist of other benefits to chase (RDSP grants, retroactive DTC refunds, Fair PharmaCare, BC bus pass, CPP-D). Reused the existing profile-tracking system backend instead of new plumbing. Commit 6412485.

Localization pipeline wired: `i18n/strings.json` master keys now match literal UI text across all five tabs (Home/Reports/Benefits/Messages/Settings). iOS Localizable.xcstrings regenerated, web locale JSON generated via `scripts/i18n-gen.mjs`, two real LocalizedStringKey bypass bugs fixed (ContentView ternary, BenefitsView helper). Web unified.html retrofitted (5 static labels wired to `window.I18N.t()`, React re-render gap flagged in source). Commit 9a5904c.

## Status (2026-08-01), iOS 3.5.13 rebuild after pre-release train closed

App Store Connect closed the pre-release train for v3.5.12 (build 139 was rejected). Bumped `MARKETING_VERSION` in `ios/project.yml` from 3.5.12 to 3.5.13, regenerated the Xcode project, and pushed to trigger a new Xcode Cloud build. Build execution pending. The 3.5.12 release remains valid for current distribution; the 3.5.13 rebuild is the next pre-release candidate.

## Screenshots (2026-08-11)
- iOS App Store screenshots regenerated via `cd ios && fastlane screenshots`. Two real bugs
  fixed to make the run produce usable images:
  - `Snapfile` was missing `xcargs("-skipPackagePluginValidation -skipMacroValidation")`, so
    the SwiftLint SPM build-tool plugin failed the headless build (same fix epiphany needed).
  - `AppState`'s `UITEST_SNAPSHOT` mock only covered `init`. Tapping the Messages tab calls
    `refreshDashboard()`, which hit a real 401 and dropped the run to the login screen, so
    "04-Messages" was a screenshot of the sign-in form. Guarded `refreshDashboard()` and
    `loadDashboardIfNeeded()` with the new `AppState.isSnapshot`.
- Also fixed: `ios/project.yml` was bundling `screenshots/` PNGs and `.claude/settings.local.json`
  into the shipped Talli.app (source scan had no excludes for them).
- STILL OPEN: the 5th shot, `05-Settings`, is not captured. The Settings tab button exists and
  is visible, but the UITest step after tapping it fails (snapshot run reports ❌ while all four
  earlier shots land fine). 4 screens per device shipped instead of 5. Debug
  `UITests/PreviewScreenshot.swift` when there's usage headroom.
- Not uploaded to ASC, App Store submission freeze, which lifted 2026-08-18.

## App Privacy corrected + published, 2026-08-18

The live listing declared `DATA_NOT_COLLECTED`. That was false, and Talli is the most sensitive app
in the portfolio to get this wrong on. The server persists per-user blobs (`src/api.js`, via
`saveUserBlob`/`loadUserBlob`): `pwd-profile` (**Persons With Disabilities designation**),
`cdb-profile`/`rdsp-profile`, `results` (benefit payment amounts), `filing-status`,
`report-status`, and `profile` (which holds `encryptedPin`, `src/api.js:1840`).

Apple's Sensitive Info definition **explicitly names disability**, so this was a factual
misdeclaration, not a borderline reading.

Now published, all `DATA_LINKED_TO_YOU` / `APP_FUNCTIONALITY`:
`USER_ID`, `OTHER_FINANCIAL_INFO`, `SENSITIVE_INFO`, `OTHER_DATA`.

Deliberately excluded: no `EMAIL_ADDRESS` (Talli has no account system of its own, state is keyed
by session `userId`), and BCeID/CRA credentials are transmitted to log into BC Self-Serve but not
persisted (`src/api.js:2015`), so they aren't "collected" under Apple's definition. `OTHER_DATA`
covers the persisted PIN, since Apple has no credentials category.

## WebMCP + REST API rollout -- shipped 2026-08-27

Done. 12 tools over the existing Express API. Gated: `submit_monthly_report` (files a real report with the ministry) and `mark_taxes_filed`. Credentials never become tool arguments -- `tools/test-webmcp.js` enforces that and runs first in `npm test`.

See `docs/API.md` for the full tool table, linked from the README.

### 4.3(a) status, verified 2026-08-27
  - Talli iOS 3.5.13 REJECTED under **Guideline 4.3(a) Design: Spam**, part of the account-level pattern hitting Sparkjar, NYC Survive, Talli, Curvely and Doorstock together. Already recorded in this roadmap; re-confirmed against the API.
  - iOS **3.5.12 is still live** (READY_FOR_SALE), the shipped app is unaffected, only the update is held.
  - Talli is the **strongest appeal case**: 3.5.7 through 3.5.12 were each individually approved and 3.5.12 is live; 3.5.13 changes no concept (security headers, WebMCP tool registration, Liquid Glass pass).
  - **This is not a per-app content problem, do not fix code and do not resubmit.** Apple's letter is byte-identical boilerplate across all five with no named comparison app. Resubmitting the same build will fail again and adds to the pattern.
  - **The appeal draft is at `~/Documents/Code/notes/appeal-4-3-spam.md` (repo root, 113 lines), NOT at `<repo>/~/Documents/Code/notes/appeal-4-3-spam.md`.** Several roadmap lines point at the per-repo path; that file does not exist in any of the five repos. Fix the pointer, do not write a second draft.
  - **Status: DRAFTED, NOT FILED.** Filing is Resolution Center, which is browser-only (`asc web review` is read-only). Blocked on Joshua. Reply order in the draft is Talli, Curvely, Doorstock; hold Sparkjar and NYC Survive.
  - Verified via API 2026-08-27: submission is UNRESOLVED_ISSUES with a single appStoreVersion item REJECTED, no phantom-IAP item, so the "mislabeled inAppPurchaseVersion" trap does not apply. `asc validate` and `asc review doctor` are otherwise clean, confirming this is a guideline call and not a readiness gap.

## App Store metadata (2026-08-30)

Canonical `metadata/` now checked in (pulled live from ASC, then corrected). It is NOT yet applied
,  version 3.5.13 is READY_FOR_SALE and Apple freezes the whole en-CA localization on a live
version. Both `asc metadata push` and `asc apps info edit` fail with "Attribute '<field>' cannot be
edited at this time". **The next version bump must push this dir**, which applies all three fixes:

Note: `asc metadata push` prints a full JSON result even when it applied nothing. Always re-pull to
a scratch dir and diff; the `actions[].status` field is the only truth.
