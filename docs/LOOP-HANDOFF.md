# Talli loop handoff (2026-10-02, paused)

## What the loop is

Roadmap to 10.0 is complete except payday push (APNs key blocked). Keep the UI super simple: every tool is one folded line that opens on tap. Next phase: real-account test with cookie jar (Joshua's login, read-only checks), fresh native build to App Store review (asc workflow, new review notes), real-device checks (reminders, Watch token handoff, vault).

## Where things stand

Eighteen releases shipped (roadmap sections 3.7.0 through 3.21.0): report from notification, Watch app, year-in-review CSV, four languages, benefit finder, RDSP tracker, supplements calendar, missed-payment alert, simplified UI (one-line folds), document vault, reconsideration helper, message replies, service requests, household tracker, trusted helper, what-if job calculator, simpler Status tab (2064px to 1026px), turning 65 or moving out of BC, budget against paydays, six new entitlements, provinces as data files (Alberta AISH, Ontario ODSP), open data API at /api/open, federal-only mode at /api/federal-finder. Ministry rate tables and earnings limits now live in code. Alberta and Ontario figures checked against public guides and official links, flagged on screen. GitHub tests green. Status tab tools all fold to one-line. Sections 7.0 and 8.0 complete. Payday push (4.0) blocked on Joshua's APNs key. App Store still has 3.6.0 (native features since 3.7.0 not in users' hands).

## Next steps

1. Real-account test: Joshua runs a one-line login (saves cookie jar to scratchpad), read-only checks on real data (household vs cheque, missed-payment alert, budget, finder prefill, helper view). Claude never types BCeID password.
2. Fresh native build to App Store review: asc workflow, update review notes with exact steps to reach new tools. First native release since 3.6.0.
3. Real-device checks: reminders firing, Watch token handoff, vault encryption on real phone.
4. Note: federal-only mode and open data API are web only.

Blocked on Joshua's APNs key for payday push.

## Restart prompt (when resuming)

```
/loop Talli: ship one fresh native build to App Store review (asc workflow, new review notes), run the real-account read-only checks with the cookie jar Joshua made, then real-device checks. Payday push stays blocked on the APNs key. Keep the UI super simple.
```

## Release cadence

Latest: 3.21.0 shipped 2026-10-02. Next: fresh native build to App Store (all features since 3.7.0 included).
