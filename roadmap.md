# Talli Roadmap

Talli is free and stays free. The job is accuracy: what lands, when, and what you are allowed to earn. History lives in git. Store state comes from `asc versions list --app 6782366555`, never from this file.

## Now (4.0.x)
- [ ] Verify the account contribution figures against the real account (#57, Joshua's login).

## 4.1 Money log
Built 2026-11-15: earnings limit bar on Home (iPhone, web) and in the new "Money in and out" tool (iPhone, Mac), earnings and expenses logged on every platform through `/api/money-log`, entries cleaned on every save (`cleanEntries`), expenses in the tax-time CSV. Test: `tools/test-money-log.js`.
- [ ] Ship 4.1.0 to TestFlight (iPhone and Mac) and check the tool on a real device.
Skipped: receipts, categories, bank import. Entries are read-modify-write, so two devices saving at once can drop one; move to append-only if that ever bites.

## 5.0 Every platform, every tool
- [ ] fr, zh and pa strings complete in the String Catalog, checked by a test. fr done; zh and pa have every plain string, the 20 benefit strings marked `review` each need a human or DeepL pass.
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

## Ingested 2026-11-18
- [ ] UI still too complicated. Money is a weird font and too big; the view should be simple with no scrolling (notes/attachments/2026-11-18/22310-1.png).
- [ ] Status tab is too complicated/noisy; shouldn't require scrolling (notes/attachments/2026-11-18/22310-3.png).
- [ ] Messages: what's with them, can we interact with them? What's with the thumbnails (initials avatars)? (notes/attachments/2026-11-18/22310-2.png)
- [ ] Settings: replace the Greek god avatar with a theme matching the project. Appearance goes at the bottom. Account name is redundant, show it once.

## Ingested 2026-11-23

- [ ] **Talli**: macOS app still behind
  - It still has the enormous text
  - And the weird font.
- [ ] **Talli**: Needs GitHub release refresh
  - And git version and tag bump
- [ ] **Talli**: Landing page needs redesign
  - No vignette it’s covering text
  - And no Greek god screenshots
  - There should be app screenshots in the landing page.
  - Screenshots (not yet read): `notes/attachments/2026-11-23/22876-1.png`, `notes/attachments/2026-11-23/22876-2.png`
