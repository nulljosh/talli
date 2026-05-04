<img src="icon.svg" width="80">

# Tally

![version](https://img.shields.io/badge/version-v3.2.0-orange)

BC Self-Serve scraper and benefits dashboard. Tracks income, payment dates, PWD application status, and government messages.

## Features

- BC Self-Serve scraper with session-encrypted credentials
- 4-tab dashboard: Home, Calendar, Status, Messages
- Income tracking with payment date countdown and streak
- Bar chart of recent payments + YTD stats
- PWD application timeline tracker with report submission history
- Calendar view with upcoming payment schedule
- Messages from BC Self-Serve (improved sync, date-aware parsing)
- Account info panel (BCeID, SIN masked, program)
- Monthly report submission with stored PIN
- Persistent paid/report status and message read state (Vercel Blob)
- Dark mode auto-detect
- PWA with offline mode
- iOS companion app

## Design

Space Grotesk font, warm parchment palette (`#faf7f4` light / `#0d0c0b` dark), clrs.cc orange (`#FF851B`) accent. 430px centered shell on desktop.

## Run

```bash
npm install && npm start
```

Open http://localhost:3000. Copy `.env.example` to `.env`.

Deploy: `cd apps/tally && npx vercel --prod`

## License

MIT 2026 Joshua Trommel
