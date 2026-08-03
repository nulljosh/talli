# Talli Roadmap

## From Talli.pdf (imported 2026-07-28)

Source note: "messages regex still a mess / And it's not really updating accurately."
Four root causes found and fixed (see Status 2026-07-28 below); these are the leftovers.

- [ ] **Messages pagination not implemented.** The BC portal's Messages list renders only ~10 rows and hides the rest behind a "Show More Messages" button. `src/http-scraper.js` does a single GET of `/Auth/Messages`, so older messages are never fetched and counts/latest-message state go stale. Currently only *detected*: `parse-messages.js` exports `hasMoreMessages()` and `/api/mobile` returns `has_more_messages: true` when the button is present — nothing consumes it yet. To finish, the postback mechanism has to be discovered against the live portal (needs real BCeID creds + a logged-in session; `.env` has them, not usable headlessly here). Likely ASP.NET `__doPostBack` with `__VIEWSTATE`/`__EVENTVALIDATION` hidden fields — capture the Messages page HTML while signed in, find the Show More control's `name`, then POST those fields back and merge the extra rows before parsing. `parseAutoSubmitForm()` in http-scraper.js already has most of the hidden-field-harvesting logic to reuse.

## Open
- [ ] Push notifications for payday + when monthly reports open (1–5 of each month)
- [ ] Next-payment card: grey line overlapping behind the amount/value — cosmetic, needs a visual check on-device before touching layout code.
- [ ] Large unused whitespace at bottom of payment card view — same, cosmetic/visual verification needed.
- [ ] Confirm banner shows "Report window open" (not filed) on next login; file report by Jul 5.
- [ ] Confirm header avatar renders (blob repointed) on next login.
- [ ] Navbar glitch: find root cause, tighten navbar code (intermittent, "solved itself") — no repro, needs live device session. Checked 2026-07-26: `TalliFloatingTabBar` (ContentView.swift:75) is a plain fixed-layout HStack/Capsule with no timers, animations tied to external state, or async work — no code-level lead found. Still needs a live repro to make progress.
- [ ] asc web login failed 401 (wrong password or Apple flake) — `asc web auth login` requires live 2FA input, can't complete headlessly. Needs Joshua to run it interactively.
- [ ] `.asc/workflow.json`'s `ship-mac` `export_mac` step uses `--pkg-path`, which this asc CLI version rejects (wants `--ipa-path` even for Mac, and further requires the destination file end in `.ipa` even though Mac exports a `.pkg`) — the workflow can't currently run end-to-end for Mac without manual intervention. Also `asc builds upload --pkg` requires `--build-number` explicitly (no auto-extraction like IPA) — verify it against the actual pkg's `Info.plist` (`pkgutil --expand-full` + `PlistBuddy -c "Print :CFBundleVersion"`) before passing it.
- [ ] App Privacy publish state flagged as unverifiable via API (`asc validate` info-level) — confirm published at https://appstoreconnect.apple.com/apps/6782366555/appPrivacy if 3.5.7 review comes back with a privacy-related rejection.

- [ ] App Store screenshot refresh (stale resolutions/content) + landing page copy/version bump.

## Status (2026-07-28) — Messages parsing fixed

Four independent root causes behind "messages regex still a mess / not updating accurately":

1. **The mobile message parser never ran.** `extractMobileData()` split each entry on `\n` to separate date from subject, but every extraction path in `http-scraper.js` does `.text().replace(/\s+/g, ' ')` — an `allText` entry can never contain a newline. The date-parsing branch was unreachable, so every message shipped `timestamp: null` with the date glued to the front of the text, and bare date lines became their own bogus rows.
2. **Real messages were being silently dropped.** `NAV_SPAM_RX` ended in `\b`, so the `monthly reports?` nav-tab pattern also matched the subject "Monthly Report Reminder" — the single most common message on the portal — filtering it out of both the list and the badge count. Nav labels are now full-line matches (plus optional badge digits).
3. **`/api/mobile` never refreshed anything.** It passes `allowLiveScrape: false` (correct — the portal's payment page hangs 60-90s and was timing the endpoint out), but `refreshLiveInBackground()` was *also* gated on that flag. So the iOS app served cached blob data and never triggered even the non-blocking background refresh. The flag now gates only the blocking path; added an `inFlightRefresh` guard so concurrent requests don't stampede the portal.
4. **The Messages tab stopped refetching on open.** v3.5.3 added refetch-on-open, but v2.4.3's custom `TalliFloatingTabBar` replaced the plain TabView — all tabs now stay alive, so `onAppear` only fires once. `ContentView`'s `onChange(of: selectedTabIndex)` now refreshes when tab 3 is selected.

Parsing moved into `src/parse-messages.js` (single source of truth for the list *and* both badge counts, which previously used three different date regexes). Handles `YYYY / MON / DD` with uppercase months and irregular spacing, the `!` action-required marker, ellipsis-truncated subjects, and date-keyed stable ids — the ids matter because iOS read-state keys off `message.id`, so unstable ids marked every message unread on every refresh.

`tools/test-parse-messages.js` (18 assertions) covers it with real portal strings. Note the old `tools/test-mobile-data.js` held a *copy* of the parser whose fixtures all contained `\n` — it asserted an impossible input shape, which is why a fully broken parser passed CI. It now imports the production parser instead of copying it. Full `npm test` green; iOS builds clean.

## Status (2026-07-27)
v3.5.11 (blue icon redesign) **SUBMITTED for review** 2026-07-27 23:18 UTC — submission `7c4b18ef-a587-4187-bfe4-3014af80dc43`, version `44fc6b9b-1957-46ba-ac02-ad73c0bfcc28`, build 202607262107. The 3.5.10 version-train block cleared (3.5.10 now READY_FOR_SALE), staging + submit ran clean.

Web: landing/login/unified/privacy/dca switched to pure white backgrounds and the system SF Pro / Helvetica stack (DM Sans + Fraunces webfonts dropped entirely) to match other projects.

## Status (2026-07-26)
iOS 3.5.8 was rejected/bounced by ASC (ITMS-90186/90062: version train closed, 3.5.8 already READY_FOR_SALE). Bumped to 3.5.9, archived/uploaded, created version, attached build, submitted for review (submissionId `32660788-1736-42da-8028-6ac5b8d7a89f`). **ACCEPTED** — review completed 2026-07-26 11:21 AM PDT, 3.5.9 now eligible for distribution/live. The build-128 Xcode Cloud failure email (ITMS-90478/90186/90062 on the abandoned 3.5.8 attempt) is stale noise from before the 3.5.9 fix — no action needed.

## Status (2026-07-21 night)
iOS 3.5.7 and Mac 3.5.6 both WAITING_FOR_REVIEW under the unified app `6782366555` (`com.heyitsmejosh.tally`) — genuine one-app, two-platform merge, verified via `asc versions list`. Old standalone Mac app `6782661988` (`com.heyitsmejosh.tally.mac`) is a permanent dead end (Apple confirmed its bundle ID is immutable) — orphaned, needs Joshua's manual ASC dashboard deletion, do not upload anything further to it.

`.env` exists now (gitignored) with real BC Self-Serve credentials for local testing.

## Ingested 2026-07-25
- [ ] Release/update notes need more variety and intelligence — feels formulaic currently.
- [ ] Add BC benefit tracking: BC Renter's Credit (auto via tax return), BC Bus Pass ($45/yr, apply once PWD confirmed), Fuel tax refund/Home Reno credit (if applicable), CLBC funding (autism dx), CPP-D (check contribution room). RDSP + RBC, CDB, PWD already in motion.

## Visual verification 2026-07-25 (iPhone 17 Pro simulator, UITEST_SNAPSHOT)
- [ ] The fix builds clean but was NOT visually re-confirmed at the bottom of the list — scrolling the sim to the end failed twice (axe swipe coords) and the session usage cap was reached. Re-check the bottom of Settings on the next sim run before treating this as fully closed. Checked 2026-07-26: fix is `SettingsView.swift:51` `.safeAreaInset(edge: .bottom) { Color.clear.frame(height: 90) }` — a static constant, not conditional, so it's not a candidate for intermittent breakage; skipping a sim boot for this per house default (only when truly needed), leaving open for an actual on-device glance next time the sim is already running for something else.

## Ship 3.5.12 — SUBMITTED 2026-07-28 night
Today's message-parser fix (94808a3) was committed+pushed but not in any build. Bumped
`ios/project.yml` MARKETING_VERSION 3.5.10 → 3.5.12, regenerated project, added
`-allowProvisioningUpdates` to both archive and export steps in `.asc/workflow.json`.
`asc workflow run ship-ios` archived+exported+uploaded clean (build 202607282147), but the
`publish` step failed since ExportOptions.plist uses `destination: upload` — export already
uploads directly to ASC, so there's no local .ipa for `asc publish appstore --ipa` to find.
Worked around manually: `asc builds wait` for the build to go VALID, `asc versions create`
(3.5.12, copied metadata from 3.5.11), `asc versions attach-build`, `asc review submit --confirm`.
Submission `8f3f038e-0f54-4751-96ec-aa1aa22dfe33`, build `be5d4b36-b481-496d-8e94-0f8afdcdafd8`.
**Follow-up**: `.asc/workflow.json`'s `publish` step is broken for this repo's export config —
either switch ExportOptions.plist destination to `export` (produce a local .ipa) or replace the
publish step with the versions-create/attach-build/review-submit sequence used here.

## Status (2026-08-02) — Bennies dashboard + i18n pipeline

Added a new Bennies dashboard tab that consolidates disability benefit tracking: DTC/PWD/CDB benefit status cards, monthly total ($1,650), debt payoff plan targeting $6k with August backpay button, and a checklist of other benefits to chase (RDSP grants, retroactive DTC refunds, Fair PharmaCare, BC bus pass, CPP-D). Reused the existing profile-tracking system backend instead of new plumbing. Commit 6412485.

Localization pipeline wired: `i18n/strings.json` master keys now match literal UI text across all five tabs (Home/Reports/Benefits/Messages/Settings). iOS Localizable.xcstrings regenerated, web locale JSON generated via `scripts/i18n-gen.mjs`, two real LocalizedStringKey bypass bugs fixed (ContentView ternary, BenefitsView helper). Web unified.html retrofitted (5 static labels wired to `window.I18N.t()`, React re-render gap flagged in source). Commit 9a5904c.

## Status (2026-08-01) — iOS 3.5.13 rebuild after pre-release train closed

App Store Connect closed the pre-release train for v3.5.12 (build 139 was rejected). Bumped `MARKETING_VERSION` in `ios/project.yml` from 3.5.12 to 3.5.13, regenerated the Xcode project, and pushed to trigger a new Xcode Cloud build. Build execution pending. The 3.5.12 release remains valid for current distribution; the 3.5.13 rebuild is the next pre-release candidate.

Still open from the parser work: pagination past page 1 is detected (`hasMoreMessages()`,
`has_more_messages`) but not implemented — needs a live signed-in portal session to discover the
"Show More Messages" postback (likely ASP.NET `__doPostBack` + `__VIEWSTATE`).
