# Tally iOS

v2.3.0

## Rules

- Portrait-only
- BC gov blue palette: #1a5a96 primary, #2472b2 mid, #4e9cd7 light, navy bg #0c1220
- Apple Liquid Glass UI, SF Pro typography
- No emojis
- Session cookies via HTTPCookieStorage.shared; on 401, prompt re-auth
- Features: 4-tab layout: Home, Reports, Benefits, Messages; Dashboard with large income amount, PWD timeline, payment calendar; Benefits tab: simple active benefits list; Monthly report submission; BC Self-Serve login; Offline caching with instant launch
- Roadmap Done: iOS companion app with full dashboard; BC Self-Serve auth + biometric sign-in; Payment calendar widget; DTC navigator (12-step screener); CRA workspace (profile, tasks, T2201 draft); RDSP guide with eligibility + resources; Dispute analyzer (legal issue analysis); Monthly report submission; Offline caching with instant launch; CSV export
- Roadmap Next: Payment history chart (sparkline/bar); PWD approval status tracker; CRA phase 2 (T4/T5 slip import); Document vault (encrypted storage); Budget planner; Push notifications for payment dates; Multi-province support; PDF report export; Accessibility audit (WCAG 2.1 AA)
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
