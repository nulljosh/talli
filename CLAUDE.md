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

## Changelog
- v3.2.1: Scrubbed BC_PIN from git history (git filter-repo). PIN now per-user AES-256 encrypted in Blob; removed from Vercel env vars.
- v3.2.0: Messages sync fixed (extractSectionData broader selectors + body fallback; parseMessages handles date-before-title ordering). StatusTab: report history from /api/report-status, account section (BCeID, SIN masked), monthly report due marks Filed when submitted. PIN moved from env var to per-user encrypted Blob (POST /api/profile/pin).
- v3.1.0: New design from claude.ai/design. Space Grotesk, warm parchment palette, #FF851B orange accent. HomeTab: streak badge, YTD stats, bar chart. CalendarTab: payment card + upcoming schedule. StatusTab: benefits summary badge. MessagesTab: initials avatars + unread hierarchy. Desktop: 430px centered shell. PAY_SCHEDULE fallback prevents stale scrape dates showing "today". Messages spam filter blocks BC accessibility boilerplate.
- v3.0.0: Enormous UI/UX simplification. Dashboard: income-centered with PWD timeline, 3 bottom tabs (Reports, Benefits, Messages). Deleted: DTC Navigator, CRA workspace, RDSP guide, Dispute analyzer, Contacts, Settings. Removed web/dashboard.html, web/benefits.html, web/dispute.html, js/dtc.js, js/dispute.js, js/legal.js. iOS: 4-tab layout, simplified BenefitsView, removed 9 view/model files. macOS: removed Settings sidebar section.
- v2.7.1: Month check-off with undo, dark mode auto-detect, compact UI. macOS companion app + WidgetKit widgets. watchOS companion (payment countdown, benefits, messages).
- v2.6.0: Persistent paid status (Vercel Blob per account, survives session expiry). Message read state tracked server-side. Generic loadUserBlob/saveUserBlob helpers. iOS paid toggle + unread badge. Concurrent async loads.
- v2.5.0: General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare, BC Bus Pass). iOS native GeneralBenefitsView. Nav anchor links.
