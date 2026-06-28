# Talli Roadmap

## App Store Connect (2026-06-22)
- [x] Confirmed local macOS AppIcon set is complete and valid — placeholder in ASC was just a missing-build issue, not a missing-asset issue.
- [x] Content rights declaration set (does not use third-party content).
- [x] Copyright set on the macOS version record.
- [x] Fixed version mismatch (1.0.0 → 1.0) and archived/exported/uploaded a build.
- [ ] **Build upload failed ASC processing** (error code 90189, no detail text via API) — check the Apple validation email for the real reason, fix, then re-upload.
- [ ] Support URL still missing — required before submission.

## Stashed 2026-06-21

## Stashed 2026-06-28
- [ ] Push notifications for payday + when monthly reports open (1–5 of each month)
- [ ] Move personal info from Reports to Settings
- [ ] Tighten calendar section layout (squish below-calendar area)

## Imported from Talli.pdf (2026-06-21)
- [ ] Login still broken (reported again) — re-checked `src/api.js` session handling: `SESSION_SECRET` IS set in Vercel production (ruled out the leading theory). Still can't reproduce without real BC Self-Serve creds in this environment. Needs Joshua to repro live and capture the actual error/network response.
