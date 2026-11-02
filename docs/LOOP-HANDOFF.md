# Talli loop handoff (2026-10-20, evening)

## What the loop is

Talli is a BC disability benefits tracker on web, iPhone and Mac at talli.jaybulb.com. The loop runs forever toward native 5.0, then 10, 50 and 100, one theme per major, per roadmap.md. The name stays Talli everywhere. Keep the UI simple: every tool is one folded line that opens on tap, and Home is one number, one line and one action. A git push deploys nothing; ship the web with `npm run deploy`.

## Where things stand

- iOS 4.0.1 (header and search videos, six iPhone shots) and Mac 4.0.0 (build 202610201455, with the federal finder link) are both Waiting for Review. iOS 4.0.0 is live. Apple allows 5 open review submissions per app; empty drafts count, so reuse one with `asc review items-add` and `submissions-submit`.
- The header and search videos come from `launch/make_banner.sh`: Talli's six glyphs in scanlines on the landing blue. `asc asset-library videos upload` prints `videoId`, then `asc localizations placements create` puts it on the localization.
- Roadmap 8.0, 9.0 and 10.0 are done in code: day-1 and day-4 report reminders, the 80 percent earnings warning, the cheque-landed alert, the printable appointment summary, and offline copies of every API read.
- The web side of that work is live. The iPhone and Mac side (sign-in province links, the reminders, the offline copies) ships in the next store builds.
- Alberta AISH earnings follow the official $350 a month from July 2, 2026. Ontario ODSP and report windows are on the server.
- An accessibility audit UI test on the signed-out screens is in progress and not committed yet.
- Open: 5.0 zh and pa review strings and the Watch real-device check; 6.0 Android (blocked on disk and a signing key); 7.0 ADAP has no published rate.

## Next, in order

1. Accessibility audit fixes: finish the signed-out UI test, then fix what it finds (VoiceOver labels, Dynamic Type at the largest size, contrast).
2. The 11 to 20 depth band in roadmap.md: benefits checker, RDSP planner, housing and shelter rates, appeals helper, then the accessibility audit per major.

When Mac 4.0.0 is approved, flip the GitHub 4.0.0 release to Latest (#62).

## For Joshua

- Check the contribution figures against your real account (#57).
- Real-device checks only you can do: reminders fire on the day, Watch handoff, vault encryption.
- Any new App Store submit waits on your yes.

## Restart prompt

```
/loop Talli to v5, 10, 50, 100, forever: read ~/.claude/loops/talli.md, docs/LOOP-HANDOFF.md and roadmap.md, scan the repo for gaps, run the next item, then re-arm. Never stop.
```
