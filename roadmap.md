# Talli Roadmap

## Stashed 2026-06-21
- [ ] App Store Connect shows a placeholder icon for "Talli Mac" — the local macOS `AppIcon.appiconset` (`macos/Assets.xcassets/AppIcon.appiconset/`) is actually complete and valid (16–1024, verified via `sips`). The placeholder is just because no build has been archived/uploaded yet for that target — archive & upload via Xcode/Transporter to populate it in ASC.

## Imported from Talli.pdf (2026-06-21)
- [ ] Login still broken (reported again) — re-checked `src/api.js` session handling: `SESSION_SECRET` IS set in Vercel production (ruled out the leading theory). Still can't reproduce without real BC Self-Serve creds in this environment. Needs Joshua to repro live and capture the actual error/network response.
