# Talli Roadmap

## Open
- [ ] Push notifications for payday + when monthly reports open (1–5 of each month)
- [x] Move personal info from Reports to Settings — SIN/phone/PIN editor now a `PersonalInfoSection` in `ios/Views/SettingsView.swift`, persisted to keychain on edit (phone persistence added to `KeychainHelper`); ReportView reads the saved values and prompts "add in Settings" when incomplete. Shared formatting in `ios/Helpers/PersonalInfo.swift`. xcodebuild passes.
- [x] Tighten calendar section layout (squish below-calendar area) — `dateCard` VStack spacing 12→4, `.padding()` → 16/14/12 h/t/b, calendar grid spacing 6→4 and title spacing 10→8 (`ios/ContentView.swift`, `ios/Views/PaymentCalendarView.swift`). Mac calendar already at these values; no Mac Reports view exists, so item 1 is iOS-only. xcodebuild passes.
- [ ] Login still broken (reported again) — re-checked `src/api.js` session handling: `SESSION_SECRET` IS set in Vercel production (ruled out the leading theory). Still can't reproduce without real BC Self-Serve creds in this environment. Needs Joshua to repro live and capture the actual error/network response.
- [ ] Next-payment card: grey line overlapping behind the amount/value — cosmetic, needs a visual check on-device before touching layout code.
- [ ] Large unused whitespace at bottom of payment card view — same, cosmetic/visual verification needed.
- [ ] Confirm banner shows "Report window open" (not filed) on next login; file report by Jul 5.
- [ ] Confirm header avatar renders (blob repointed) on next login.
- [ ] Generate QR code for printed stickers linking to app — needs a QR lib (no `qrcode`/`qrencode` installed); small task, do with deps next pass.
- [ ] Navbar glitch: find root cause, tighten navbar code (intermittent, "solved itself") — no repro, needs live device session.
- [ ] asc web login failed 401 (wrong password or Apple flake) — `asc web auth login` requires live 2FA input, can't complete headlessly. Needs Joshua to run it interactively.
- [ ] `.asc/workflow.json`'s `ship-mac` `export_mac` step uses `--pkg-path`, which this asc CLI version rejects (wants `--ipa-path` even for Mac, and further requires the destination file end in `.ipa` even though Mac exports a `.pkg`) — the workflow can't currently run end-to-end for Mac without manual intervention. Also `asc builds upload --pkg` requires `--build-number` explicitly (no auto-extraction like IPA) — verify it against the actual pkg's `Info.plist` (`pkgutil --expand-full` + `PlistBuddy -c "Print :CFBundleVersion"`) before passing it.
- [ ] App Privacy publish state flagged as unverifiable via API (`asc validate` info-level) — confirm published at https://appstoreconnect.apple.com/apps/6782366555/appPrivacy if 3.5.7 review comes back with a privacy-related rejection.

- [ ] Vibe clone from portfolio — Talli's blue accent (#5B9BD5/#BFDDF0) is still hardcoded in CLAUDE.md/CSS, not pulled from shared `portfolio-tokens.css` like other apps (see vibe_tokens_sync). User flagged "too much blue."
- [ ] App Store screenshot refresh (stale resolutions/content) + landing page copy/version bump.

## Status (2026-07-21 night)
iOS 3.5.7 and Mac 3.5.6 both WAITING_FOR_REVIEW under the unified app `6782366555` (`com.heyitsmejosh.tally`) — genuine one-app, two-platform merge, verified via `asc versions list`. Old standalone Mac app `6782661988` (`com.heyitsmejosh.tally.mac`) is a permanent dead end (Apple confirmed its bundle ID is immutable) — orphaned, needs Joshua's manual ASC dashboard deletion, do not upload anything further to it.

`.env` exists now (gitignored) with real BC Self-Serve credentials for local testing.

## Ingested 2026-07-25
- [ ] Approved for CDB — next month +$200/mo plus ~$2600 lump sum (~$2800 total), plus welfare/PWD (~$1000-1450 more). Add a countdown feature showing daily total income from disability (e.g. $1450 + $200/mo, broken into hourly).
- [ ] Release/update notes need more variety and intelligence — feels formulaic currently.
- [ ] Add BC benefit tracking: BC Renter's Credit (auto via tax return), BC Bus Pass ($45/yr, apply once PWD confirmed), Fuel tax refund/Home Reno credit (if applicable), CLBC funding (autism dx), CPP-D (check contribution room). RDSP + RBC, CDB, PWD already in motion.
