<img src="icon.svg" width="80">

# School iOS

![version](https://img.shields.io/badge/version-v1.0.0-blue)

iOS companion for [School](https://tally.heyitsmejosh.com/school) — grade tracker for Langley SD35 D2L Brightspace.

## Features

- Pre-Calculus 12 + Anatomy & Physiology 12 grade tracking
- Animated splash screen
- Portrait-only, native WKWebView wrapper
- Full BC SD35 Brightspace integration

## Run

```bash
xcodegen generate && open School.xcodeproj
xcodebuild -scheme School -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

## Stack

SwiftUI · WKWebView · xcodegen

## License

MIT 2026, Joshua Trommel
