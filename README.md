<img src="icon.svg" width="80">

# Tally

![version](https://img.shields.io/badge/version-v3.0.0-blue)

## Features

- BC Self-Serve scraper with session-encrypted credentials
- Income tracking, payment dates, DTC navigator
- General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare)
- CRA workspace -- tax-year tasks, slips/notices checklist, T2201 draft generation
- PWA with offline mode
- iOS companion app with native benefits guide
- Persistent paid status and message read state (Vercel Blob)
- Month check-off with undo
- Dark mode auto-detect
- Compact UI layout
- macOS companion app + WidgetKit widgets
- watchOS companion (payment countdown, benefits, messages)

## Run

```bash
npm install && npm start
```

Open http://localhost:3000. Copy `.env.example` to `.env`.

Deploy: Vercel (Puppeteer via `@sparticuz/chromium`, Blob cache for scrape results).

## Roadmap

- [ ] Payment history chart (sparkline/bar)
- [ ] PWD approval status tracker
- [ ] CRA phase 2 (T4/T5 slip import)
- [ ] Document vault (encrypted Blob storage)
- [ ] Multi-province support

## License

MIT 2026 Joshua Trommel
