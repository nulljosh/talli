# Talli Roadmap

Talli is free and stays free. The job is accuracy: what lands, when, and what you are allowed to earn. History lives in git. Store state comes from `asc versions list --app 6782366555`, never from this file.

## Now (4.0.x)
- [ ] Verify the account contribution figures against the real account (#57, Joshua's login).

## 5.0 Every platform, every tool
- [ ] Real-device pass: reminders fire on the day, Watch handoff, vault encryption.

## 6.0 Android
- [ ] Ship `kmp/` as a signed APK on the GitHub release, same API, same four tabs.

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
- [ ] (blocked 11-01: the rest wait on Apple) Animated hero for the other apps. Placed and live on 14: Epiphany, Echo, Bugle, Melete, Machaon, Pan, Patois, Temida, Kernel, Eponym, Gastown, Nimble, Icelus, Coda. Waiting for review: Doorstock, Hamurapi, Toroid. No live iOS version yet, so theirs go in with the next version: Horula, Atlin, Plaintxt, Scrounger, Airwell, Blackcomb. Rerun `_attic/store-headers/place.py --go` once they clear.

## Ingested 2026-10-30

