# Tally iOS

v2.5.0

## Rules

- Portrait-only
- Warm parchment palette: matches web (#faf7f4 bg / #1a1612 text / #FF851B orange accent)
- Solid cards: `Color(.secondarySystemGroupedBackground)` -- no ultraThinMaterial
- `Color.tallyOrange` for all accent uses (calendar, paid toggle, tab tint, avatar fallback)
- Shared `AvatarView(size:)` for all avatar rendering (ContentView toolbar + SettingsView)
- Avatar: node-graph SVG style (Anthropic dots/lines), generated via `AppState.generateNodeGraphAvatar()`, cached to Documents dir as PNG. Tap in SettingsView to regenerate.
- SF Pro typography
- No emojis
- Session cookies via HTTPCookieStorage.shared; on 401, prompt re-auth
- Features: 4-tab layout: Home, Reports, Benefits, Messages; Dashboard with large income amount, PWD timeline, payment calendar; Benefits tab: simple active benefits list; Monthly report submission; BC Self-Serve login; Offline caching with instant launch
- Roadmap Done: iOS companion app with full dashboard; BC Self-Serve auth + biometric sign-in; Payment calendar widget; DTC navigator (12-step screener); CRA workspace (profile, tasks, T2201 draft); RDSP guide with eligibility + resources; Dispute analyzer (legal issue analysis); Monthly report submission; Offline caching with instant launch; CSV export
- Roadmap Next: Payment history chart (sparkline/bar); PWD approval status tracker; CRA phase 2 (T4/T5 slip import); Document vault (encrypted storage); Budget planner; Push notifications for payment dates; Multi-province support; PDF report export; Accessibility audit (WCAG 2.1 AA)
- Changelog v2.6.0 (2026-05-28): AppState.reportMonths + isCurrentMonthFiled wired from /api/report-status. Dashboard shows orange "Report window open" banner (days 1-5, not filed) or green "Report filed this month" (days 1-5, filed). APIClient.getReportStatus() added.
- Changelog v2.5.0 (2026-05-11): MessagesView redesigned to match web — initials circles (orange=unread, gray=read), unread dot, tap-to-expand, per-message read marking via AppState. Avatar migrated from UserDefaults to Documents disk cache; generation consolidated into AppState.generateNodeGraphAvatar() (node-graph Anthropic style), SettingsView drops duplicate implementation.
- Changelog v2.4.1 (2026-05-07): Fixed app icon PNGs — SVG was rasterized without scaling, icon sat in top-left 200px of 1024x1024 canvas. Regenerated all three variants (light, dark, tinted) via cairosvg at full 1024x1024. Splash screen now shows tally marks (LaunchIcon + LaunchBackground assets) instead of blank screen.
- Changelog v2.4.0 (2026-05-05): tallyOrange accent throughout. Solid cards replace glass. Pixel-art avatar (Core Graphics, 6 palettes). Top-right avatar button → Settings. "in X days" hero text + earning rate footnote. Shared AvatarView. daysUntilPayment moved to AppState. Removed accentGlassCard/parchment dead code.
- Changelog v2.3.0: SettingsView with avatar generation (node-graph, now replaced). TabView tint updated.
- Changelog v2.2.0 (2026-03-25): Persistent paid toggle on dashboard (syncs with server). Unread message badge clears on tab open, read state persisted via API. Models refactored to Models/ directory. Concurrent async loads on login.
- Changelog v2.1.0 (2026-03-24): General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare, BC Bus Pass). Native SwiftUI cards. Default tab on Benefits.
- Changelog v2.0.1 (2026-03-20): Redesigned app icon: dark terminal aesthetic, proper 1024x1024 scaling; Centered clipboard + checklist design with BC gov blue palette
- Changelog v2.0.0 (2026-03-18): Added RDSP guide (eligibility, key features, CRA resource links); Synced with tally web v2.4.0; Major version bump
- Changelog v1.1.0: CRA workspace, DTC navigator, dispute analyzer; Payment calendar, offline caching, CSV export
- Changelog v1.0.0: Initial release with dashboard and BC Self-Serve auth

## Run

```bash
xcodegen generate && open Tally.xcodeproj
xcodebuild -scheme Tally -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

## Key Files

- TallyApp.swift: app entry point and scene setup
- ContentView.swift: root tab layout and navigation
- Models/AppState.swift: observable app state and session data
- API/APIClient.swift: BC Self-Serve networking with cookie-based auth
- KeychainHelper.swift: secure credential storage for biometric sign-in
- Services/CSVExporter.swift: dashboard CSV export
