# Tally Roadmap

## 2026-05-30 -- App Store submission (free, keep BC Self-Serve auto-login)
Strategic call: Tally ships FREE. Audience is income-assistance recipients; never paywall it. It is the proof-of-competence flagship, not a revenue line. Echo is first-dollar, not Tally.
- [ ] Register a free Basic BCeID (throwaway email) as the App Store review login. Logs in, no benefits file behind it, so reviewer sees the genuine empty state. No fake data, no review-only code path.
- [ ] App Store Connect review notes: explain the personal-account model + attach a populated-dashboard screenshot. One-liner: "Mobile client for the user's own BC income assistance account, accessed with their own credentials. Test account has no active file, so the dashboard is empty; attached screenshot shows a populated state." This is the Guideline 5.2.2 defense.
- [ ] Add `ios/PrivacyInfo.xcprivacy` privacy manifest + App Store privacy nutrition label declaring credential handling.
- [ ] Audit `src/api.js` + `src/scraper.js`: confirm BCeID creds transit HTTPS-only and never land in server logs at the Puppeteer hop (the one legit privacy-reviewer ding).
- [ ] Archive build, upload to App Store Connect, submit for review.

## 2026-04-28
- [ ] Sync Claude design
- [ ] Print QR stickers for app
- [ ] Publish it ($100/m)
- [ ] Stabilize -- Snow Leopard-style huge overhaul (stability, no new features)
- [ ] First published app in 10 years

## 2026-04-24
- [x] DTC application tracker (web + iOS) -- Applied April 2026, CRA processing
- [x] CRA upcoming payments section -- GST/HST $174.50 due June 5, 2026
- [x] Monthly report timing warning -- don't submit before the 28th
- [ ] CRA automatic benefits integration (4 annual returns: GST/HST, Climate Action, CWB, CCB)
- [ ] PWD decision follow-up (expected May 2026)

## 2026-04-23
- [x] Website footer URL fixed to apps/tally monorepo path
- [x] iOS Xcode errors: "Cannot find 'SettingsView'", var→let on `cal` and `target`
- [ ] Verify earning-per-hour calc (looks like it drifts toward payday)
- [ ] Add scaling graph for earnings over time
- [ ] Auto-adjust when income bump is approved (make it a single config field)
