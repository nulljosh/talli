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
