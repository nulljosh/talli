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
- v3.6.0 (2026-05-14): Landing page hero heading added. Login page redesigned to match parchment design system (Space Grotesk, orange CTA, matches landing). Web settings tab added (avatar, username, refresh, sign out). Avatar generator upgraded to 200px topology approach (star/hex/mesh) matching epiphany quality. iOS AvatarView removed .interpolation(.none) bitmap rendering. iOS AppState.generateNodeGraphAvatar upgraded to 200px topology. SettingsView avatar tap hint added.
- v3.5.0 (2026-05-11): Server extractMobileData uses djb2 content-hash IDs (same algorithm as web) instead of positional msg-N strings. Cross-platform read state now syncs correctly between web and iOS via shared ID namespace.
- v3.4.0 (2026-05-11): Web — removed duplicate "tally." hero wordmark from landing page. Messages read state lifted to App level (readIds survives polls + tab switches, badge clears correctly). iOS — MessagesView redesigned with initials circles, unread dot, tap-to-expand, per-message read API sync. Avatar generation consolidated into AppState (node-graph, disk cache, UserDefaults migration).
- v3.3.0: iOS UI overhaul (tallyOrange accent, solid cards, pixel-art avatar via Core Graphics, top-right settings shortcut, "in X days" hero text, earning rate footnote). Landing page redesigned as hero splash (wordmark, preview card, feature row). Notification read-state now server-synced on mount (merge) and on tap. api.js read-messages POST unions instead of overwrites. Shared AvatarView component (ContentView + SettingsView). Removed dead accentGlassCard/parchment.
- v3.2.2: Redesigned icon. v3.2.1: Scrubbed BC_PIN from git history (git filter-repo). PIN now per-user AES-256 encrypted in Blob; removed from Vercel env vars.
- v3.2.0: Messages sync fixed (extractSectionData broader selectors + body fallback; parseMessages handles date-before-title ordering). StatusTab: report history from /api/report-status, account section (BCeID, SIN masked), monthly report due marks Filed when submitted. PIN moved from env var to per-user encrypted Blob (POST /api/profile/pin).
- v3.1.0: New design from claude.ai/design. Space Grotesk, warm parchment palette, #FF851B orange accent. HomeTab: streak badge, YTD stats, bar chart. CalendarTab: payment card + upcoming schedule. StatusTab: benefits summary badge. MessagesTab: initials avatars + unread hierarchy. Desktop: 430px centered shell. PAY_SCHEDULE fallback prevents stale scrape dates showing "today". Messages spam filter blocks BC accessibility boilerplate.
- v3.0.0: Enormous UI/UX simplification. Dashboard: income-centered with PWD timeline, 3 bottom tabs (Reports, Benefits, Messages). Deleted: DTC Navigator, CRA workspace, RDSP guide, Dispute analyzer, Contacts, Settings. Removed web/dashboard.html, web/benefits.html, web/dispute.html, js/dtc.js, js/dispute.js, js/legal.js. iOS: 4-tab layout, simplified BenefitsView, removed 9 view/model files. macOS: removed Settings sidebar section.
- v2.7.1: Month check-off with undo, dark mode auto-detect, compact UI. macOS companion app + WidgetKit widgets. watchOS companion (payment countdown, benefits, messages).
- v2.6.0: Persistent paid status (Vercel Blob per account, survives session expiry). Message read state tracked server-side. Generic loadUserBlob/saveUserBlob helpers. iOS paid toggle + unread badge. Concurrent async loads.
- v2.5.0: General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare, BC Bus Pass). iOS native GeneralBenefitsView. Nav anchor links.
