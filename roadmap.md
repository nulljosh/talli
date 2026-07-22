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
- [ ] Confirm the Mac build (uploadId be3ab224) reaches VALID, then create/attach/submit its App Store version (same `asc versions create` → `attach-build` → `review submit` sequence used for iOS 3.5.7 above — check `asc age-rating edit --app-info-id <mac app-info id>` too, likely needs the same social-media fields set).
- [ ] App Privacy publish state flagged as unverifiable via API (`asc validate` info-level) — confirm published at https://appstoreconnect.apple.com/apps/6782366555/appPrivacy if 3.5.7 review comes back with a privacy-related rejection.

## From Talli.pdf (imported 2026-07-14)
- [x] iOS has new icon (from icon rebrand v3.5.4) — Mac app icon needs the same update, still on old art. Fixed: regenerated `macos/Assets.xcassets/AppIcon.appiconset/*.png` (16–1024px) from root `icon.svg` via `rsvg-convert` — verified bg pixel now `#1a1a1a` (was `#1a1712` brown). Needs a Mac archive/build to actually ship it.

## From Merge status.pdf (imported 2026-07-21)
- [x] Mac merge: root cause found from Apple's validation email — macOS `TalliWidgets` extension target's Info.plist was missing `NSExtension.NSExtensionPointIdentifier` (present on iOS target, dropped on Mac's xcodegen config) plus a CFBundleShortVersionString/CFBundleVersion mismatch vs the parent app. Fixed both in `macos/project.yml`'s `TalliWidgets.info` block, archived (build 202607211732), exported, uploaded (`Talli.pkg`, uploadId 46f5e748) — awaiting Apple processing.

## Stashed 2026-07-19
- [x] iOS 3.5.5 (build 97, ITMS-90473 widget/version fix) SUBMITTED for review 2026-07-19 (submission 3162cba4)
- [ ] macOS 1.0 (app 6782661988) still PREPARE_FOR_SUBMISSION — same prep pass needed (build, metadata, availability) when Mac push resumes
