# Talli Roadmap

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

- [ ] No "remember me". Storing a BCeID password needs a real keystore per platform
      (EncryptedSharedPreferences / DPAPI / libsecret); today you sign in each launch.
      Add it when the friction is an actual complaint.
- [ ] No monthly report submission on the Compose clients (`ReportView` on iOS) --
      it wants the SIN/phone/PIN form and a dry-run preview.
- [ ] Payment calendar and theme picker are iOS/macOS only.
- [ ] Android and desktop builds are unsigned CI artifacts, not store listings.

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

- [ ] Turn this into the $499/mo referral-listing product: paid firms opt in,
      free orgs stay free. Not built -- today it's a static curated list.
- [ ] Wire `web/js/legal.js` into an actual unified.html tab; it's dead code today.

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

- [ ] macOS/watchOS not wired yet, iOS only. Same pure functions would port directly; the watchOS
      target doesn't have a real dashboard screen yet either (see "Mirror the same income block to
      watchOS" below), do both together.
- [ ] No Settings toggle to turn reminders off individually, revoking notification permission in
      iOS Settings is the only way today. Add if it comes up as friction.

## Open
- [ ] Large unused whitespace at bottom of payment card view, **investigated in the sim 2026-08-03, no removable padding found.** The gap is the `.safeAreaPadding(.bottom, 90)` clearance (`ContentView.swift:326`) reserved for `TalliFloatingTabBar`, not excess padding, if anything it's ~4pt short. Closing this properly is a design decision (more content, or a non-floating bar), not a padding tweak. Don't re-investigate blind.
- [ ] Confirm banner shows "Report window open" (not filed) on next login; file report by Jul 5.
- [ ] Confirm header avatar renders (blob repointed) on next login.
- [ ] Navbar glitch: intermittent, "solved itself," no repro. Checked 2026-07-26: `TalliFloatingTabBar` (ContentView.swift:75) is a plain fixed-layout HStack/Capsule with no timers/animations/async work, no code-level lead found. Needs a live repro to make progress.
- [ ] asc web login failed 401, `asc web auth login` requires live 2FA input, needs Joshua to run it interactively.
- [ ] App Privacy publish state flagged as unverifiable via API (`asc validate` info-level), confirm published at appstoreconnect.apple.com/apps/6782366555/appPrivacy if a future review comes back privacy-related.
- [ ] App Store screenshot refresh (stale resolutions/content), screenshots were regenerated 2026-08-11 (see Screenshots section); the 5th (Settings) still doesn't capture and is held from publication, which is what's left here.

## Stashed 2026-08-10

- [ ] **Push notifications (payday + reporting window days 1–5).** Not started, talli has **zero** push infrastructure: no `UNUserNotificationCenter` usage, no `registerForRemoteNotifications`, no `aps-environment` entitlement, no `remote-notification` background mode, no device-token storage, no sender. A real APNs build also needs an Apple Developer APNs key (credentialed dashboard step) plus a scheduler, and talli's host has no cron.
  **Cheaper shape to build instead:** both triggers are *known calendar dates*, not server events, the reporting window is always days 1–5, and payday is derivable from the scraped payment history. So this wants **local** notifications (`UNCalendarNotificationTrigger`), which need no APNs key, no device tokens, no server, and no background mode at all. Scope is then: permission prompt on first run, schedule/reschedule on launch + after each scrape, mirror across iOS/macOS/watchOS. Don't start by building a push backend.

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

## Ingested 2026-07-25
- [ ] Release/update notes need more variety and intelligence, feels formulaic currently.
- [ ] Add BC benefit tracking: BC Renter's Credit (auto via tax return), BC Bus Pass ($45/yr, apply once PWD confirmed), Fuel tax refund/Home Reno credit (if applicable), CLBC funding (autism dx), CPP-D (check contribution room). RDSP + RBC, CDB, PWD already in motion.

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

## From Apple Notes (imported 2026-08-10)
- [ ] iOS avatar is device-local only (`AppState.generateNodeGraphAvatar`, disk-cached PNG) and never syncs with the server's avatar, so iOS and web show different avatars. Real fix needs SVG rendering on iOS (server stores SVG) or a server-side PNG variant, deliberately not built as part of the letter-icon fix.
- [ ] Refresh `CHEQUE_ISSUE_DATES` in `src/pay-dates.js` when BC publishes the 2027 cheque issue schedule, after 2026-12-16 the app shows "--" for the next payment date until it is added.

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

## From Apple Notes (imported 2026-08-13)
- [ ] Analyze project from CLAUDE.md + README.md, then refresh the app icon based on that analysis

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

## From Notes (imported 2026-08-19)
- [ ] Mirror the same income block to watchOS and both widget targets. The payload
      already carries `income`, so each is a decode + small view; deferred 2026-08-19
      only to conserve weekly quota. `watchos/ContentView.swift` is a 12-line stub and
      needs a real screen first.
- [ ] Automate the ASC 2FA code (currently Joshua screenshots it every login). Idea:
      route the code to SMS and read it from `~/Library/Messages/chat.db` via SQL, wired
      to `ASC_WEB_2FA_CODE_COMMAND`. Headless, no System Events. Unproven: needs Full
      Disk Access, and Apple may not offer an SMS path for this flow, timebox it.

## Ingested 2026-08-22
- [ ] Messages still stale, separate from the amount bug, not yet investigated.

## From Apple Notes (imported 2026-08-25)

- [ ] Landing page font doesn't really match other codebase projects. Vibe clone from the others.
- [ ] Messages is still stale, needs a refresh/fix.
- [ ] Clone Epiphany's landing page approach across web projects (Lexly, Healstack, Talli, etc.): show the actual product beyond the login/registration wall, Epiphany shows the real map as the home page.

## WebMCP + REST API rollout -- shipped 2026-08-27

Done. 12 tools over the existing Express API. Gated: `submit_monthly_report` (files a real report with the ministry) and `mark_taxes_filed`. Credentials never become tool arguments -- `tools/test-webmcp.js` enforces that and runs first in `npm test`.

See `docs/API.md` for the full tool table, linked from the README.
- [ ] iOS rejected 4.3(a) Spam 2026-08-26. Appeal draft: ~/Documents/Code/notes/appeal-4-3-spam.md (Resolution Center, web only).

## From Notes (imported 2026-08-27)
- [ ] App Review flagged **Talli 3.5.13 for iOS** (submitted Aug 27 2026 01:48 PM PDT, submission `bbb79864-00aa-4d6d-bd55-93459bcd7086`). Get the real reason via `asc web review show`, fix, resubmit.
- [ ] Decide: `landing.html`/`login.html` still hardcode 16 border-radius values and 3 box-shadows, against canonical's square/no-shadow signature, but `CLAUDE.md` documents the "14px border-radius standard" as deliberate. Squaring a live product's UI is a taste call. Settle the conflict, then make CLAUDE.md and the CSS agree.
- [ ] Decide: web accent is now bulb yellow while the shipped iOS/macOS icon and App Store screenshots are blue `#5B9BD5`. Web and native have diverged.
talli/roadmap.md

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

- [ ] **marketingUrl + supportUrl were dead.** They pointed at `tally.heyitsmejosh.com`, stale from
      the Talli rename; that host does not resolve (curl 000, vs 200 for `talli.`). A live App Store
      listing is currently advertising a broken support link. Fixed in `metadata/`, awaiting release.
- [ ] Keywords retuned: dropped `benefits` (generic) and `disability tax credit` (21 chars) for
      `cheque day`, `BC Self-Serve`, and `hardship`, higher intent, uncontested. 92/100 chars.

Note: `asc metadata push` prints a full JSON result even when it applied nothing. Always re-pull to
a scratch dir and diff; the `actions[].status` field is the only truth.
