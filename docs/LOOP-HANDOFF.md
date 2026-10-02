# Talli loop handoff (2026-10-02, live)

## What the loop is

Roadmap to 10.0: take the next unchecked item, ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua and note them. Keep the UI super simple: every new tool is one folded line that opens on tap. At the end submit one fresh native build to App Store review.

## Where things stand

Eleven releases shipped (3.7.0-3.16.0): report from notification, Watch app, year-in-review CSV, four languages, benefit finder, RDSP tracker, supplements calendar, missed-payment alert, simplified UI (one-line tool folds), document vault, reconsideration helper (20-day counter, 8-step checklist, draft letter), message replies (draft answers), service requests (crisis supplement, address, rent, missing cheque), household tracker (couples rates, shared earnings limits in 2026), trusted helper (90-day revocable read-only links, token hash, auto-kill). Status tab tools are now all one-line folds. Sections 7.0 and 8.0 complete. Payday push (4.0) remains blocked on Joshua's APNs key.

## Next, in order

1. What-if job calculator: try "20 hours a week", see exemption, clawback, take-home by month
2. Moving out of BC or turning 65: what changes (OAS/GIS), when, what to file
3. Budget against real paydays: bills on calendar next to the money that pays them
4. Alberta AISH and Ontario ODSP data files and tracking
5. Federal-only mode for CDB/GST/Dental only users
6. Open data API: publish pay dates and rate tables
7. Final UI pass: group Status tools under three themed rows (keeps super simple)
8. Fresh native build to App Store review

Blocked on Joshua's APNs key.

## Restart prompt

```
/loop Talli roadmap to 10.0: in ~/Documents/Code/talli, take the next unchecked roadmap.md item (what-if), ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua (APNs key) and note them. QA every item as we go (sims, render checks, real numbers) before checking it off. Keep the UI super simple: every new tool is one folded line that opens on tap. At the end submit one fresh native build to App Store review.
```

## Release cadence

Releases tagged on GitHub when roadmap items ship. Latest: 3.16.0 shipped 2026-10-02. Next: 3.17.0 for what-if, 4.0.0 for payday push once APNs arrives.
