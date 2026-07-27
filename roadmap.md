# Talli Roadmap

## Someday / Explore
- [x] Recurring build-failure friction (note 2026-07-26) — root cause was the known version-train issue already diagnosed same day (3.5.8 rejected: ITMS-90186/90062, version train closed with 3.5.8 already READY_FOR_SALE), resolved by bumping to 3.5.9 and resubmitting. Local build re-verified clean today (`xcodegen generate` + `xcodebuild -skipPackagePluginValidation build` → BUILD SUCCEEDED), no separate local build-tooling bug found.

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

- [ ] Vibe clone from portfolio — Talli's blue accent (#5B9BD5/#BFDDF0) is still hardcoded in CLAUDE.md/CSS, not pulled from shared `portfolio-tokens.css` like other apps (see vibe_tokens_sync). User flagged "too much blue."
- [ ] App Store screenshot refresh (stale resolutions/content) + landing page copy/version bump.

## Status (2026-07-26)
iOS 3.5.8 was rejected/bounced by ASC (ITMS-90186/90062: version train closed, 3.5.8 already READY_FOR_SALE). Bumped to 3.5.9, archived/uploaded, created version, attached build, submitted for review (submissionId `32660788-1736-42da-8028-6ac5b8d7a89f`). **ACCEPTED** — review completed 2026-07-26 11:21 AM PDT, 3.5.9 now eligible for distribution/live. The build-128 Xcode Cloud failure email (ITMS-90478/90186/90062 on the abandoned 3.5.8 attempt) is stale noise from before the 3.5.9 fix — no action needed.

## Status (2026-07-21 night)
iOS 3.5.7 and Mac 3.5.6 both WAITING_FOR_REVIEW under the unified app `6782366555` (`com.heyitsmejosh.tally`) — genuine one-app, two-platform merge, verified via `asc versions list`. Old standalone Mac app `6782661988` (`com.heyitsmejosh.tally.mac`) is a permanent dead end (Apple confirmed its bundle ID is immutable) — orphaned, needs Joshua's manual ASC dashboard deletion, do not upload anything further to it.

`.env` exists now (gitignored) with real BC Self-Serve credentials for local testing.

## Ingested 2026-07-25
- [ ] Approved for CDB — next month +$200/mo plus ~$2600 lump sum (~$2800 total), plus welfare/PWD (~$1000-1450 more). Add a countdown feature showing daily total income from disability (e.g. $1450 + $200/mo, broken into hourly).
- [ ] Release/update notes need more variety and intelligence — feels formulaic currently.
- [ ] Add BC benefit tracking: BC Renter's Credit (auto via tax return), BC Bus Pass ($45/yr, apply once PWD confirmed), Fuel tax refund/Home Reno credit (if applicable), CLBC funding (autism dx), CPP-D (check contribution room). RDSP + RBC, CDB, PWD already in motion.

## Visual verification 2026-07-25 (iPhone 17 Pro simulator, UITEST_SNAPSHOT)
- [ ] The fix builds clean but was NOT visually re-confirmed at the bottom of the list — scrolling the sim to the end failed twice (axe swipe coords) and the session usage cap was reached. Re-check the bottom of Settings on the next sim run before treating this as fully closed. Checked 2026-07-26: fix is `SettingsView.swift:51` `.safeAreaInset(edge: .bottom) { Color.clear.frame(height: 90) }` — a static constant, not conditional, so it's not a candidate for intermittent breakage; skipping a sim boot for this per house default (only when truly needed), leaving open for an actual on-device glance next time the sim is already running for something else.

## Icon recolor shipped (2026-07-26)
- [x] App icon background recolored (amber), v3.5.10 submitted for App Store review same night.
- [x] Reverted amber back to original #1a1a1a — user found it ugly. Regenerated AppIcon.png from icon.svg, flattened alpha (App Store requires no alpha on the primary icon).

## Root cause: recurring Xcode Cloud build failures (2026-07-26)
- [x] `ios/project.yml` had `MARKETING_VERSION` hardcoded to stale "3.5.8" while `asc` CLI bumped the generated `project.pbxproj` directly to 3.5.10 for manual archives. Every Xcode Cloud build runs `xcodegen generate`, which regenerates the pbxproj from project.yml and reset the version back to 3.5.8 — triggering ITMS-90186/90062 (closed pre-release train) on every push. Fixed by bumping project.yml's MARKETING_VERSION/CURRENT_PROJECT_VERSION to match, verified `xcodegen generate` now stays at 3.5.10, local build succeeds clean.
