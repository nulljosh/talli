# Talli iOS

The iPhone app. Versions live in App Store Connect, not here. The repo rules in `../CLAUDE.md` apply.

## Rules
- Portrait only. System font everywhere; the Home amount is SF Pro Rounded bold, 56pt at most (`Views/HeroAmountView.swift`, shared with Mac).
- Four tabs: Home, Status, Messages, Settings. Each tab owns its NavigationStack. No avatar button; the avatar (a Greek-god portrait from the server) sits in Settings.
- Accent is `Color.talliBlue` (#5B9BD5). Cards use `Color(.secondarySystemGroupedBackground)` on the grouped background, radius 20. Liquid Glass on 26+ via `View+Glass.swift`.
- Session cookies live in `HTTPCookieStorage.shared`; a 401 asks the person to sign in again.
- `DashboardData` decodes each block with `try?`, so one bad field never blanks Home.

## Run
```bash
xcodegen generate && open Talli.xcodeproj
xcodebuild -scheme Talli -destination 'platform=iOS Simulator,name=iPhone 18 Pro' -skipPackagePluginValidation build
```
`-skipPackagePluginValidation` is needed on every CLI build: SwiftLint runs as a package plugin.

## Key files
- `TalliApp.swift`, `ContentView.swift`: entry point and the tab shell
- `Models/AppState.swift`: state, loading, sync
- `API/APIClient.swift`: the talli.jaybulb.com API
- `Views/`: one file per screen
- `Tests/TallyTests.swift`, `UITests/PreviewScreenshot.swift`: unit tests and the App Store screenshots
