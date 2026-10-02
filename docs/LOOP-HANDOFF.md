# Talli loop handoff (2026-10-02, late evening, loop stopped)

## What the loop is

Roadmap to 10.0: take the next unchecked item, ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua and note them.

## Where things stand

Five releases shipped today (3.7.0-3.11.0): monthly report filing from notification, Apple Watch app embedded (WatchConnectivity), year in review CSV, Spanish/Tagalog/Arabic/Farsi with right-to-left layout, benefit finder, RDSP grant and bond tracker, supplements calendar with reminders, missed-payment alerts with steps and ministry words, simplified UI timelines, document vault (PWD letter, medical report, ID, lease, encrypted PBKDF2+AES-256-GCM). Payday push (4.0) remains blocked on Joshua's APNs key. Loop stopped per Joshua's request.

## Next, in order

1. Message replies from Talli: answer a ministry message without opening My Self Serve
2. Service requests: crisis supplement, address change, shelter update started from app
3. Reconsideration helper: denied? Walk the 20-business-day deadline with checklist and draft letter
4. Couples and families: two-adult PWD rates, spouse earnings, dependants, shared exemption math
5. Trusted helper: share read-only access with a caseworker, advocate, family member
6. Rent and shelter: log rent changes, see shelter maximum, flag when wrong
7. What-if scenarios: try job options, see exemption/clawback/take-home by month

Payday push (4.0) blocked on Joshua's APNs key. Provinces outside BC (8.0-10.0) are future roadmap.

## Restart prompt

```
/loop Talli roadmap to 10.0: in ~/Documents/Code/talli, take the next unchecked roadmap.md item (message replies), ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua (APNs key) and note them. QA every item as we go (sims, render checks, real numbers) before checking it off.
```

## Release cadence

Releases tagged on GitHub when roadmap items ship. Latest: 3.11.0 shipped 2026-10-02. Next: 3.12.0 for message replies, 4.0.0 for payday push once APNs arrives.
