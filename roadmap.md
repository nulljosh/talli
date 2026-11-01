# Talli Roadmap

Talli is free and stays free. The job is accuracy: what lands, when, and what you are allowed to earn. History lives in git. Store state comes from `asc versions list --app 6782366555`, never from this file.

## Now (4.0.x)
- [ ] Verify the account contribution figures against the real account (#57, Joshua's login).
- [ ] Joshua's call: delete the dead `src/session-store.js` and `tools/test-session-store.js` (nothing imports them).

## 5.0 Every platform, every tool
- [ ] fr, zh and pa strings complete in the String Catalog, checked by a test. fr done; zh and pa have every plain string, the 20 benefit strings marked `review` each need a human or DeepL pass.
- [ ] Watch shows the next amount and date with no phone nearby. Built: it calls `/api/summary` with its own token and caches the last result; needs the real-device check below.
- [ ] Real-device pass: reminders fire on the day, Watch handoff, vault encryption.

## 6.0 Android
- [ ] Ship `kmp/` as a signed APK on the GitHub release, same API, same four tabs.
- [ ] Google Play listing, free.

## 7.0 More provinces
- [ ] (blocked: no Alberta or Ontario account source to read from, 2026-11-01) Province picked at sign-in, rules tested per province like BC. In: "Alberta or Ontario? See your rules" on the iPhone and Mac sign-in screens (next cheque, earnings, reporting, no account). Left: a per-province Home once an AB or ON account source exists.

## 8.0 Reminders that matter

## 9.0 Helpers

## 10.0 Offline first

## 11 to 20: depth
- Benefits checker for every federal and BC program a person might be missing.
- RDSP planner: grants and bonds by year, what to put in to get the most.
- Housing and shelter rates, moving and crisis supplement guides.
- Appeals helper: dates, forms, and what to say, reviewed by an advocate.
- Accessibility audit each major: VoiceOver, Dynamic Type at the largest size, contrast.

## 21 to 50: reach
- Every Canadian province and territory.
- Advocate and legal clinic directory by city.
- Plain-language mode for every screen.
- Community-maintained rule tables with a test for every change.

## 51 to 100: the standard
- The default place anyone on assistance in Canada checks their money.
- Open data on cheque dates and rates for any app to use.
- Partnerships with advocacy groups, still free, still no ads.
- Each major is one theme, shipped on every platform, tested, and documented.

## Ingested 2026-10-21

- On-device Self-Serve login (2026-10-25): today the BCeID password goes through the backend, encrypted in the session cookie, and the server re-logs in on every pull (src/api.js:165). Moving the login and scrape onto the phone would make "Talli never holds your credentials" true, and is the strongest answer to App Review guideline 5.1.1(ix), which otherwise needs an organization developer account for the next update.

## Ingested 2026-10-27
- [ ] Animated hero for the other apps: made for 23 apps with `scripts/store-header.sh` (labs) and uploaded 2026-10-27. 17 sent to App Review 2026-10-28; once each is APPROVED, place it with `_attic/store-headers/place.py --go`. Horula, Atlin, Plaintxt, Scrounge, Airwell and Blackcomb have no live iOS version yet, so theirs go in with the next version. 2026-11-01: placed on 15 live listings (Epiphany, Echo, Bugle, Melete, Machaon, Pan, Patois, Temida, Kernel, Eponym, Gastown, Nimble, Icelus, Coda, plus Talli before). place.py now skips any video not APPROVED. Left: Bcgd, Hamurapi, Toroid (videos waiting for review, rerun place.py --go once approved) and the six without a live iOS version.

## Ingested 2026-10-30
- [x] (11-01: the amount was Talli Display, a renamed Barlow Condensed; now the bold system font on web, iPhone and Mac, never stretched) Income number shouldn't be stretched, needs matching font (Q 11-01: which screen and platform? No screenshot came with the note, the dashboard needs a sign-in, and nothing in the code uses a stretched width; the one scaling number is incomeCell in ios/ContentView.swift with minimumScaleFactor 0.8)

- [x] Remove the demo from the landing (Joshua 2026-11-01: it overflows). Done 2026-11-01: hero goes straight to the band, demo HTML, CSS and JS cut, deployed
