# Talli

BC income-assistance tracker. Free. Web, iOS, macOS and watchOS. Versions live in App Store Connect (`asc versions list --app 6782366555`), not in this file.

## Rules
- No emojis anywhere.
- Live at talli.jaybulb.com. `heyitsmejosh.com` lapsed on purpose; never reference it.
- Runs on Cloudflare Workers (`wrangler.jsonc`, `worker/index.mjs`). Deploy with `npm run deploy`. **A git push deploys nothing.**
- Storage is Workers KV (`src/_blob.js`). `web/` is served by the assets binding; only `/` runs the Worker first.
- Four tabs on every platform: Home, Status, Messages, Settings (a floating glass nav bar on Mac, Cmd-1 to 4). No avatar button; the avatar lives in Settings (Joshua, 2026-10-20). Each tab owns its NavigationStack, or toolbar items vanish. Tab roots have no title; the tab bar already names them. Home is one number, one line, one action, then the money tiles and calendar; the long breakdown folds under Details. Tools open as rows in an inset grouped list, never nested folds.
- Native look: Liquid Glass on 26+ via `View+Glass.swift` (`liquidGlass`, `capsuleAction`), one radius set (cards and groups 20), 48 point capsule actions, grouped background behind cards.
- Design: `web/brand.html` (live at /brand) is the kit, `brand/tokens.css` the tokens, `web/landing.css` the landing styles. Padding, margin and gap come only from the space scale (4, 8, 12, 16, 24, 32, 48). Side margin 20, controls 48 tall, system font everywhere; the Home amount is SF Pro Rounded bold, 56pt at most, never screen-filling (Joshua 2026-11-20).
- `web/tokens.css` imports the canonical `jaybulb.com/tokens.css` and only aliases. Accent is Talli blue `#5B9BD5`. Talli overrides only the accent and the surfaces (cool greys, no beige, Joshua 2026-11-20); never redeclare any other canonical colour.
- The CSP lives in `web/_headers`. A new external host must be added there or the browser blocks it.
- Poll with `visibilityInterval()`, never a raw `setInterval`.

## Run
```bash
npm install
npm start      # localhost:3000
npm test       # full suite, also runs in CI
```

## Key files
- `worker/index.mjs`, `src/api.js` -- Worker entry and the API
- `src/http-scraper.js` -- BC Self-Serve login and scrape (HTTP only)
- `src/parse-messages.js` -- the message parser; `/api/mobile` serves it to every client
- `web/unified.html` -- the dashboard; `web/landing.html` -- public page
- `ios/`, `macos/`, `watchos/`, `widgets-*` -- native apps (xcodegen `project.yml`)

## Login
BCeID locks after a few wrong passwords. Never retry a failed login in a loop. Credentials for testing are in the gitignored `.env`.

## Ship
`asc workflow run ship-ios VERSION:x.y.z SUBMIT:false` builds and uploads to TestFlight without submitting for review. `ship-mac` does the Mac. Submit with `asc review submit` after checking the build. Run `asc versions list` first for the real current version.

## The loop
See `docs/LOOP-HANDOFF.md` for where things stand and the restart prompt. Open work is in `roadmap.md`.
