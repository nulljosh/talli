# Talli Roadmap

## App Store Connect (2026-06-22)
- [ ] **Build upload failed ASC processing** (error code 90189, no detail text via API) — check the Apple validation email for the real reason, fix, then re-upload.
- [ ] Support URL still missing — required before submission.

## Stashed 2026-06-21

## Stashed 2026-06-28
- [ ] Push notifications for payday + when monthly reports open (1–5 of each month)
- [ ] Move personal info from Reports to Settings
- [ ] Tighten calendar section layout (squish below-calendar area)

## Imported from Talli.pdf (2026-06-21)
- [ ] Login still broken (reported again) — re-checked `src/api.js` session handling: `SESSION_SECRET` IS set in Vercel production (ruled out the leading theory). Still can't reproduce without real BC Self-Serve creds in this environment. Needs Joshua to repro live and capture the actual error/network response.

## Imported from Talli.pdf (2026-07-01)
- [ ] Calendar date is stale, showing last week instead of current date — should be simplest thing to make dynamic
- [ ] Next-payment card: grey line overlapping behind the amount/value
- [ ] Large unused whitespace at bottom of payment card view
- [ ] Notifications not updating — stuck on old messages, newer ones exist

## Pending verification (2026-07-01, v3.5.3)
- [ ] Xcode Cloud green: build 42 should appear VALID in ASC (`asc builds list --app 6782366555 --limit 2`) — widget @Sendable fix pushed in 443496d, built clean locally. If no build appears, the workflow may still point at old Tally.xcodeproj path (known issue from v3.5.1) — check Manage Workflows in Xcode.
- [ ] Confirm banner shows "Report window open" (not filed) on next login; file report by Jul 5.
- [ ] Confirm header avatar renders (blob repointed) on next login.

## Pending verification (2026-07-09, v3.5.4)
- [x] v3.5.4 uploaded to TestFlight (2026-07-09): builds 202607091312 + 76 both processingState VALID under prerelease 3.5.4 — blue flattened icon is live in TestFlight. The publish CLI's "FAILED 90189/90345" was a redundant-binary bounce (duplicate re-upload), NOT a real rejection (no email). TODO: final App Store review submission via web UI if desired (CLI --submit hit the dupe).

## From Icons.pdf / Asc.pdf (imported 2026-07-12)
- [ ] Talli Mac 1.0 PREPARE_FOR_SUBMISSION — build, screenshots, metadata, submit

## 2026-07-14 dump
- [ ] Fix failing GitHub Actions tests (nulljosh/talli Tests workflow, main)
- [ ] Fix Xcode Cloud builds/tests
- [ ] ASC ITMS-90473: TalliWidgets CFBundleShortVersionString (2.4.4) != app (3.5.4) — align, bump build
- [ ] Submit latest version to App Store
- [ ] Generate QR code for printed stickers linking to app
- [ ] iOS UI refresh — at minimum splash screen
- [ ] Navbar glitch: find root cause, tighten navbar code (intermittent, "solved itself")
- [ ] Fix What's New screen — too much spacing, size to content
- [ ] Resume 3.5.5 ship: `asc workflow run --file .asc/workflow.json ship-ios --resume ship-ios-20260714T085150Z-45be0270` after deleting stale .asc/artifacts/Talli.xcarchive (archive step needs --overwrite)
- [ ] asc web login failed 401 (wrong password or Apple flake) — retry `asc web auth login` tomorrow, then Lexly Mac review pull
