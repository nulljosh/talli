<img src="icon.svg" width="80">

# Tally

![version](https://img.shields.io/badge/version-v3.4.1-orange)

BC Self-Serve scraper and benefits dashboard. Tracks income, payment dates, PWD application status, and government messages.

## Features

- BC Self-Serve scraper with session-encrypted credentials
- 4-tab dashboard: Home, Calendar, Status, Messages
- Income tracking with payment countdown, "in X days" hero, and earning rate (payment ÷ hrs remaining)
- Bar chart of recent payments + YTD stats
- PWD and DTC application timeline trackers with report submission history
- Calendar view with upcoming payment schedule
- Messages with server-synced read state (load on mount, persist on tap)
- Account info panel (BCeID, SIN masked, program)
- Monthly report filing window banner (auto-shows days 1–5 of each month)
- Monthly report submission with stored PIN
- Persistent paid/report status (Vercel Blob)
- Multilingual (en, fr, zh, pa): one master string source generates both the web i18next bundle and the Xcode String Catalog, plus `Intl` CAD currency/date formatting. Benefit strings flagged for human/DeepL review.
- Dark mode auto-detect
- PWA with offline mode
- iOS companion app (parchment palette, orange accent, pixel-art avatar, top-right settings shortcut)

## Design

Space Grotesk font, warm parchment palette (`#faf7f4` light / `#0d0c0b` dark), clrs.cc orange (`#FF851B`) accent. 430px centered shell on desktop. iOS matches web: solid cards, orange accents, 8×8 pixel-art avatar generated with Core Graphics.

## Run

```bash
npm install && npm start
```

Open http://localhost:3000. Copy `.env.example` to `.env`.

Deploy: `cd apps/tally && npx vercel --prod`

## License

MIT 2026 Joshua Trommel

## Roadmap
- [x] Top-right avatar spins while regenerating (refresh state lifted into Screen) — both avatars animate
- [x] Hid the settings entry in the bottom nav; top-right avatar is now the settings link
- [ ] Avatar still does not persist across reloads (avatarUrl not rehydrated on load) — separate fix
- [ ] Sync mobile and web: web is missing the countdown the mobile app already has
- [ ] Improve countdown functionality and UI
- [ ] Rework the increasing-payment-per-hour model: pay is a monthly lump sum, so either remove the increasing-accrual visual or redesign it to read as a steady rate paid out monthly
