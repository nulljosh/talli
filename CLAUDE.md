# Tally

## Rules
- No emojis anywhere
- Warm parchment aesthetic: Light (#faf7f4 bg / #1a1612 text), Dark (#0d0c0b bg / #f2ede8 text)
- Accent: #FF851B (clrs.cc orange)
- Font: Space Grotesk (Google Fonts) + system fallback
- 430px max-width shell centered on desktop
- 640px max-width, single-column, text-first
- Theme toggle: sun/moon SVG, View Transitions API, `[data-theme="dark"]`
- No glass morphism, no noise texture, no gradients -- solid colors only
- Spring hover: `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Never use raw `setInterval` for API polling -- always use `visibilityInterval()` helper (pauses when tab hidden, prevents Vercel invocation burn)

## Run
```bash
npm install
npm start          # localhost:3000
npm run check      # run scraper
npm run upload-blob # upload to Vercel Blob
```

## Key Files
- `src/api.js` -- Express API, auth, session handling
- `src/scraper.js` -- Puppeteer BC Self-Serve scraper
- `web/landing.html` -- public landing page
- `web/unified.html` -- dashboard (auth required)
- `web/benefits.html` -- benefits guide (disability, general BC/Canada, retirement)
- `tools/dtc_apply.py` -- T2201/DTC helper

## PWD Roadmap (Joshua's account — 2026-05-14)
- Active PWD application was denied. Resubmission in progress.
- **Feature needed**: PWD Resubmit button on Status tab — one-click to pre-fill and resubmit the PWD application directly from Tally, without navigating BC Self-Serve. Support queuing multiple submissions with deduplication tracking.
- **Status tab**: Add reconsideration deadline tracker (20 business days from denial letter date).

## Changelog
- v1.0.0 (2026-05-22): History reset. BC Self-Serve scraper with session-encrypted credentials, payment amount tracking, PWD application timeline, messages sync, Vercel Blob persistence, iOS + watchOS companion apps.
