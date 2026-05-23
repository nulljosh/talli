# Tally

## Rules
- No emojis anywhere
- Monochrome aesthetic cloned from heyitsmejosh.com portfolio
- Color: Light (#ffffff/#171717/#737373/#e5e5e5), Dark (#0a0a0a/#fafafa/#a3a3a3/#262626)
- System font stack only -- no Google Fonts
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

## Changelog
- v3.0.0: Enormous UI/UX simplification. Dashboard: income-centered with PWD timeline, 3 bottom tabs (Reports, Benefits, Messages). Deleted: DTC Navigator, CRA workspace, RDSP guide, Dispute analyzer, Contacts, Settings. Removed web/dashboard.html, web/benefits.html, web/dispute.html, js/dtc.js, js/dispute.js, js/legal.js. iOS: 4-tab layout, simplified BenefitsView, removed 9 view/model files. macOS: removed Settings sidebar section.
- v2.7.1: Month check-off with undo, dark mode auto-detect, compact UI. macOS companion app + WidgetKit widgets. watchOS companion (payment countdown, benefits, messages).
- v2.6.0: Persistent paid status (Vercel Blob per account, survives session expiry). Message read state tracked server-side. Generic loadUserBlob/saveUserBlob helpers. iOS paid toggle + unread badge. Concurrent async loads.
- v2.5.0: General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare, BC Bus Pass). iOS native GeneralBenefitsView. Nav anchor links.
