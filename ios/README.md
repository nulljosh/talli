<img src="icon.svg" width="80">

# Tally iOS
![version](https://img.shields.io/badge/version-v2.4.1-orange)

<p align="center">
  <img src="fastlane/screenshots/en-US/iPhone 17 Pro-01-Home.png" width="200">
  <img src="fastlane/screenshots/en-US/iPhone 17 Pro-02-Reports.png" width="200">
  <img src="fastlane/screenshots/en-US/iPhone 17 Pro-03-Benefits.png" width="200">
  <img src="fastlane/screenshots/en-US/iPhone 17 Pro-04-Messages.png" width="200">
</p>

iOS companion for [Tally](https://tally.heyitsmejosh.com), the BC benefits tracker. SwiftUI (iOS 17+, Swift 6), `@Observable` state, URLSession cookie jar auth, xcodegen. Backend: Vercel + Puppeteer at tally.heyitsmejosh.com.

[Architecture](architecture.svg)

## Features

- 4-tab layout: Home, Reports, Benefits, Messages
- Dashboard with payment amount, countdown, payment calendar, PWD/DTC timelines
- Monthly report submission
- BC Self-Serve login with biometric sign-in
- Offline caching with instant launch
- CSV export
- Pixel-art avatar (Core Graphics, 6 palettes)
- Warm parchment palette, tallyOrange accent, solid cards

## Run

```bash
xcodegen generate
open Tally.xcodeproj
```

Requires Xcode 26.2 beta, iOS 17+ simulator.

To regenerate App Store screenshots:

```bash
fastlane snapshot
```

Runs `UITests/PreviewScreenshot.swift` against a mocked authenticated session (`UITEST_SNAPSHOT` launch argument, no real BC Self-Serve credentials needed) across the devices listed in `fastlane/Snapfile`.

## Roadmap

- [ ] Payment history chart (sparkline/bar)
- [ ] Push notifications for payment dates
- [ ] PDF report export

## Changelog

### v2.4.1 (2026-05-07)
- Fixed app icon: SVG was rasterized without scaling, placing the design in the top-left 200px of a 1024x1024 canvas. Regenerated light, dark, and tinted variants via cairosvg at full scale.
- Splash screen: tally marks on dark background (#1a1612) via UILaunchScreen + named color/image assets.

### v2.4.0 (2026-05-07)
- tallyOrange accent throughout (button, tabs, calendar, avatar)
- Solid cards replace glass (no ultraThinMaterial)
- Pixel-art avatar via Core Graphics (6 palettes, mirrors web generatePixelArtSVG)
- Login screen: orange icon, BCEID section labels, solid fields, orange Sign In button
- App icon updated to orange tally-mark design
- Splash tagline aligned with web: "Your benefits. No bureaucracy."

### v2.3.0 (2026-03-28)
- Contacts sync
- PWD approval status tracker
- Benefits view updates
- Theme cleanup

### v2.2.0 (2026-03-25)
- Persistent paid toggle on dashboard (syncs with server)
- Unread message badge clears on tab open, read state persisted via API
- Models refactored to Models/ directory
- Concurrent async loads on login

### v2.1.0 (2026-03-24)
- General benefits guide (grocery rebate, GST/HST, climate credit, CWB, CCB, SAFER, PharmaCare, BC Bus Pass)
- Native SwiftUI cards
- Default tab on Benefits

### v2.0.0 (2026-03-18)
- Added RDSP guide (eligibility, key features, CRA resource links)
- Synced with tally web v2.4.0

## License

MIT 2026 Joshua Trommel
