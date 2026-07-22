# Talli Roadmap

## App Store Connect (2026-06-22)
- [x] **Build upload failed ASC processing** (error code 90189) — superseded; `asc builds list --app 6782366555` shows all builds through v3.5.6 (build 103, 2026-07-20) VALID.
- [x] Support URL missing — it was actually set but pointed at stale `tally.heyitsmejosh.com`; tried `asc apps info edit --support-url https://talli.heyitsmejosh.com` but ASC rejected it: "supportUrl cannot be edited at this time" (metadata locked while a version is in review). Retry once the in-flight review clears.

## Stashed 2026-06-21

## Stashed 2026-06-28
- [ ] Push notifications for payday + when monthly reports open (1–5 of each month)
- [ ] Move personal info from Reports to Settings
- [ ] Tighten calendar section layout (squish below-calendar area)

## Imported from Talli.pdf (2026-06-21)
- [ ] Login still broken (reported again) — re-checked `src/api.js` session handling: `SESSION_SECRET` IS set in Vercel production (ruled out the leading theory). Still can't reproduce without real BC Self-Serve creds in this environment. Needs Joshua to repro live and capture the actual error/network response.

## Imported from Talli.pdf (2026-07-01)
- [x] Calendar date is stale — checked `ContentView.swift`/`PaymentCalendarView.swift`: `now` is driven by a 1s `Timer.publish` ticker and passed live into the view; already correctly dynamic in current code, no fix needed.
- [ ] Next-payment card: grey line overlapping behind the amount/value — cosmetic, needs a visual check on-device before touching layout code.
- [ ] Large unused whitespace at bottom of payment card view — same, cosmetic/visual verification needed.
- [x] Notifications not updating — resolved by commit 070db1f which removed the Status Messages section entirely (was the stuck-on-old-messages surface).

## Pending verification (2026-07-01, v3.5.3)
- [x] Xcode Cloud green: superseded — `asc builds list --app 6782366555` shows builds through v3.5.6 (build 202607192341) all VALID as of 2026-07-19, well past build 42.
- [ ] Confirm banner shows "Report window open" (not filed) on next login; file report by Jul 5.
- [ ] Confirm header avatar renders (blob repointed) on next login.

## Pending verification (2026-07-09, v3.5.4)
- [x] v3.5.4 uploaded to TestFlight (2026-07-09): builds 202607091312 + 76 both processingState VALID under prerelease 3.5.4 — blue flattened icon is live in TestFlight. The publish CLI's "FAILED 90189/90345" was a redundant-binary bounce (duplicate re-upload), NOT a real rejection (no email). TODO: final App Store review submission via web UI if desired (CLI --submit hit the dupe).

## From Icons.pdf / Asc.pdf (imported 2026-07-12)
- [ ] Talli Mac 1.0 PREPARE_FOR_SUBMISSION — build, screenshots, metadata, submit

## 2026-07-14 dump
- [x] Fix failing GitHub Actions tests — `gh run list --repo nulljosh/talli` shows CI + Tests both green on main as of 2026-07-20 (commits through "docs: README v3.5.6").
- [x] Fix Xcode Cloud builds/tests — resolved alongside the above; ASC build history shows a clean run of VALID builds through v3.5.6.
- [x] ASC ITMS-90473 version mismatch — fixed per 2026-07-19 stashed entry (build 97, submission 3162cba4) and commit 070db1f ("dynamic CRA data" pass).
- [x] Submit latest version to App Store — v3.5.5 (build 97) SUBMITTED 2026-07-19; v3.5.6 built (build 202607192341, VALID) but not yet separately submitted — new roadmap item added below.
- [ ] Generate QR code for printed stickers linking to app — needs a QR lib (no `qrcode`/`qrencode` installed); small task, do with deps next pass.
- [x] iOS UI refresh — splash screen — login/splash contrast fixed in commit 070db1f.
- [ ] Navbar glitch: find root cause, tighten navbar code (intermittent, "solved itself") — no repro, needs live device session.
- [x] Fix What's New screen spacing — "What's New truncation fix" landed in commit 070db1f.
- [x] Resume 3.5.5 ship — already SUBMITTED 2026-07-19 (see Stashed 2026-07-19 below); workflow resume no longer needed.
- [ ] asc web login failed 401 (wrong password or Apple flake) — `asc web auth login` requires live 2FA input, can't complete headlessly. Needs Joshua to run it interactively.

## 2026-07-20 sweep
- [x] v3.5.6 (build 103, VALID) not yet submitted — superseded; 3.5.6 is now READY_FOR_SALE (live).

## 2026-07-21 night: iOS 3.5.7 ship + real bugs found
- [x] Xcode Cloud build 105 failed + Apple rejected upload (ITMS-90478/90186/90062: version 3.5.5 train closed, needs a version higher than approved 3.5.6). Root cause: `ios/project.yml` `MARKETING_VERSION` was still hardcoded `"3.5.5"`, stale since it never got bumped past the already-shipped 3.5.6. Fixed via `asc workflow run ship-ios VERSION:3.5.7` (bump/archive/export/upload all succeeded, build 202607212021 VALID).
- [x] **Workflow tooling bug**: `.asc/workflow.json`'s `ship-ios`/`ship-mac` `publish` step failed (`failed to stat IPA: ... no such file or directory`) because `asc xcode export`'s upload method uploads the binary directly to ASC and never writes a local IPA, but `publish appstore --ipa` expects one to exist. Worked around manually: `asc versions create` → `asc age-rating edit` (see below) → `asc versions attach-build` → `asc validate` → `asc review submit`. TODO: either have `export` produce a local IPA copy, or give the workflow a "attach existing build + submit" step that doesn't require `--ipa`.
- [x] **New Apple age-rating requirement blocked submission**: `asc validate` surfaced `age_rating.missing_field` for `socialMedia`/`socialMediaAgeRestricted` — new required fields not previously part of the age rating declaration. Talli has no social features, answered both `false` via `asc age-rating edit --app-info-id <PREPARE_FOR_SUBMISSION app-info id>`. Any other app not yet re-submitted since this rolled out will likely hit the same block — check `asc validate` before assuming an old age-rating declaration is still complete.
- [x] **Real bug: Mac widget-fix build uploaded to the wrong ASC app record.** A prior session's manual resume command (`asc builds upload --app 6782366555 ...`) used the *iOS* app ID instead of Mac's `6782661988` — confirmed via `asc apps view --id` (6782366555 = `com.heyitsmejosh.tally`, 6782661988 = `com.heyitsmejosh.tally.mac`) and cross-checking `asc builds list` per app (the misplaced build, minOsVersion 14.0, only showed under the iOS app's build list). Left the stray upload in place (it's inert, not attached to any version; will auto-expire) and re-uploaded the same already-built `macos/.asc/artifacts/TalliMacFixExport/Talli.pkg` to the correct app `6782661988` (uploadId be3ab224) — no rebuild needed, pkg was already on disk. Result now processing; when VALID, attach to a Mac 3.5.6/3.5.7 version and submit the same way as iOS above.
- [x] First Mac re-upload (be3ab224) was built from a stale reused pkg — root cause found: `macos/project.yml`'s `TalliWidgets` target had no `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` override, so its Info.plist fell back to the stale top-level `1.0.0`/`"1"` instead of matching the main app target (real structural drift bug, not a one-off). This is what actually caused ITMS-90345 (CFBundleVersion mismatch: 202607211732 vs 202607212025), which arrived in a later email after this roadmap entry was written. Fixed by consolidating both targets onto one top-level version in `project.yml` (commit 8d8cfff), then re-running a fresh `xcodebuild -exportArchive` (the workflow's own `export_mac` step has an unrelated CLI-flag bug, `--pkg-path` isn't recognized — worked around manually) and re-uploading (uploadId `2be1761b`, version 3.5.6 build 202607212037).
- [x] **CORRECTED COURSE**: `6782661988` is a dead end — Apple's own rejection email confirmed "The bundle identifier cannot be changed from the current value 'com.heyitsmejosh.tally.mac'... you will need to create a new application" — this app can never be unified with iOS. Real merge path (matching the pattern already used for Echo/Sparkjar): upload Mac builds to the **iOS app**, `6782366555` (bundle `com.heyitsmejosh.tally`, already matches the Mac target's `PRODUCT_BUNDLE_IDENTIFIER` in `macos/project.yml`). Ran `xcodegen generate` (restored the widget `NSExtensionPointIdentifier` fix, which had regressed from an earlier stale-archive reuse), fresh archive + export, and uploaded to `6782366555` — build `8b29a831` (version 3.5.6, build 202607212100) is VALID. `6782661988` is now orphaned, same as Echo's old "Echo Transcribe Mac" record — needs Joshua to delete via ASC dashboard (no API path), do not upload anything further to it.
- [x] **DONE 2026-07-21 night**: turned out a MAC_OS 3.5.6 version had already been created moments before the app-record lock kicked in — rescuable rather than truly stuck. Attached build `8b29a831`, filled the empty description (copied from iOS's), set encryption declaration false, confirmed age-rating fields already correct (shared app-info with iOS), and took a **real** Mac screenshot: no `macos/fastlane/screenshots/mac/*.png` existed at all, so built+launched the actual Debug app (`xcodebuild -scheme TalliMac -destination 'platform=macOS' build`, then `open`), captured with `screencapture`, resized 1920x1080 → 1440x900 (an allowed App Store size), committed to `macos/fastlane/screenshots/mac/1-main.png`. Submitted — submission `8dae8aa5`, both iOS 3.5.7 and Mac 3.5.6 now WAITING_FOR_REVIEW under the single unified app (6782366555). Merge fully complete and verified via `asc versions list` showing both platforms on one app ID.
- [x] **`.env` created 2026-07-21 night** with real BC Self-Serve credentials (Joshua provided directly), gitignored.
- [x] **Better Mac screenshot captured** via the existing `fastlane mac_screenshots` lane (uses `UITEST_SNAPSHOT` demo-state bypass in `MacAppState.swift`, doesn't actually need `.env` — that's for the web scraper backend, not the native app's login) — real authenticated-dashboard screenshot now sits at `macos/fastlane/screenshots/mac/1-main.png` (resized 900x640 → 1280x800). First attempt at running the lane hit a flaky "Timed out while enabling automation mode" UI-test error; retry succeeded immediately, likely a one-off automation-permissions hiccup, not a real bug.
- [x] **Real bug found and fixed: screenshot pipeline could leak live personal account data.** `TalliMacApp.swift`'s `.task { await appState.bootstrap() }` ran unconditionally, even under `UITEST_SNAPSHOT` — if this dev machine had real BC Self-Serve credentials stored in Keychain from past testing, `bootstrap()` would silently log in and overwrite the mock dashboard with **real live payment data** before the screenshot was captured (this is exactly what happened: a screenshot showed $1,060.00 / Jul 23 — real account data — instead of the mock's $1,080.00 / Jul 25). Fixed by guarding the `.task` call site AND adding the same guard inside `bootstrap()` itself (matching the pattern iOS already had correctly). Verified clean after rebuild: screenshot now shows exactly the mock values, no real data. Same fix applied defensively even though iOS's `bootstrap()` was already gated — macOS's wasn't.
- [x] **Couldn't upload the corrected screenshot** — ASC rejects replacement mid-review ("Can't Delete Screenshot After Submit for review"). Not a problem: the screenshot actually attached to the live submission is an earlier one (blank/login screen from a manual launch, before the mock-based pipeline existed) — no real or fake dashboard data was ever exposed to Apple. The corrected, verified-clean screenshot now sits at `macos/fastlane/screenshots/mac/1-main.png` for the next version bump.
- [ ] Also file upstream: `.asc/workflow.json`'s `ship-mac` `export_mac` step uses `--pkg-path`, which this asc CLI version rejects (wants `--ipa-path` even for Mac, and further requires the destination file end in `.ipa` even though Mac exports a `.pkg`) — the workflow can't currently run end-to-end for Mac without manual intervention. Also `asc builds upload --pkg` requires `--build-number` explicitly (no auto-extraction like IPA) — verify it against the actual pkg's `Info.plist` (`pkgutil --expand-full` + `PlistBuddy -c "Print :CFBundleVersion"`) before passing it, a mismatch here caused two wasted upload/wait cycles tonight.
- [ ] App Privacy publish state flagged as unverifiable via API (`asc validate` info-level) — confirm published at https://appstoreconnect.apple.com/apps/6782366555/appPrivacy if 3.5.7 review comes back with a privacy-related rejection.

## From Talli.pdf (imported 2026-07-14)
- [x] iOS has new icon (from icon rebrand v3.5.4) — Mac app icon needs the same update, still on old art. Fixed: regenerated `macos/Assets.xcassets/AppIcon.appiconset/*.png` (16–1024px) from root `icon.svg` via `rsvg-convert` — verified bg pixel now `#1a1a1a` (was `#1a1712` brown). Needs a Mac archive/build to actually ship it.

## From Merge status.pdf (imported 2026-07-21)
- [x] Mac merge: root cause found from Apple's validation email — macOS `TalliWidgets` extension target's Info.plist was missing `NSExtension.NSExtensionPointIdentifier` (present on iOS target, dropped on Mac's xcodegen config) plus a CFBundleShortVersionString/CFBundleVersion mismatch vs the parent app. Fixed both in `macos/project.yml`'s `TalliWidgets.info` block, archived (build 202607211732), exported, uploaded (`Talli.pkg`, uploadId 46f5e748) — awaiting Apple processing.

## Stashed 2026-07-19
- [x] iOS 3.5.5 (build 97, ITMS-90473 widget/version fix) SUBMITTED for review 2026-07-19 (submission 3162cba4)
- [ ] macOS 1.0 (app 6782661988) still PREPARE_FOR_SUBMISSION — same prep pass needed (build, metadata, availability) when Mac push resumes
