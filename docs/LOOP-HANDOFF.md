# Talli loop handoff (2026-10-02, evening)

## What the loop is

Roadmap to 10.0: take the next unchecked item, ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua and note them.

## Where things stand

3.7.0 shipped with monthly report filing from notification, Apple Watch app embedded (WatchConnectivity), year in review with CSV export, Spanish/Tagalog/Arabic/Farsi with right-to-left layout, and benefit finder surfacing every BC and federal program (33+ covering bus pass, crisis supplement, Fair PharmaCare, Canada Dental, RDSP grants). Payday push (4.0) remains blocked on an APNs key from Joshua. Next: RDSP grant and bond tracker.

## Next, in order

1. RDSP grant and bond tracker: what the government matched, what's left this year, what carries forward
2. Supplements on the calendar: transportation, dietary, annual bus pass renewal with reminders
3. Missed-payment alert: payday passes, portal shows nothing, Talli tells you who to call and what to say
4. Document vault: PWD decision letter, medical report, ID, leases (encrypted, in iCloud)
5. Message replies from Talli: answer a ministry message without opening My Self Serve
6. Service requests: crisis supplement, address change, shelter update started from app
7. Reconsideration helper: denied? Walk the 20-business-day deadline with checklist and draft letter

Payday push (4.0) blocked on Joshua's APNs key. Couples and families (8.0), trusted helper, rent and shelter (8.0-9.0), what-if scenarios, and provinces outside BC are future roadmap.

## Restart prompt

```
/loop Talli roadmap to 10.0: in ~/Documents/Code/talli, take the next unchecked roadmap.md item (4.0 -> 10.0), ship it on web/iOS/macOS, tests green, commit+push, check it off, release as you go. Skip items blocked on Joshua (APNs key) and note them. QA every item as we go (sims, render checks, real numbers) before checking it off.
```

## Release cadence

Releases tagged on GitHub when roadmap items ship. Version bumps follow: 3.7.0 just shipped; 3.8.0 for RDSP tracker, 3.9.0 for supplements calendar, 4.0.0 for payday push once APNs arrives.
