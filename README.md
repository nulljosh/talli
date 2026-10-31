<img src="icon.svg" width="80" style="border-radius:18px">

![version](https://img.shields.io/badge/version-v4.0.0-blue)
![license](https://img.shields.io/badge/license-Apache%202.0-green)

<p align="center">
  <img src="docs/screenshots/ios-home.png" width="220">
  <img src="docs/screenshots/mac-home.png" width="520">
</p>

When does the money come? How much?

Talli answers that for people on BC income assistance. It reads BC Self-Serve for you and puts one number on the screen: your next payment.

Free. Always.

## Three tabs

- **Home**: the next payment, big, with the days left. Everything else sits under Details.
- **Status**: PWD, RDSP and CDB, and the benefits you can claim.
- **Messages**: your Self-Serve messages, newest first, on every device.

iPhone, Mac, Apple Watch and web. English, French, Chinese and Punjabi.

## Run

```bash
npm install && npm start
```

Open http://localhost:3000. Copy `.env.example` to `.env`. Runs on Cloudflare Workers; deploy with `npm run deploy`.

## Terminal

```bash
npm link            # puts `talli` on your PATH
talli login         # once; tries BCeID one time and keeps only a read-only token
talli               # $1,260  tomorrow  Wed, Oct 21
talli summary       # the breakdown and message count (--json for scripts)
talli tui           # full screen, the amount centred; r refreshes, q quits
```

## More

[Whitepaper](docs/WHITEPAPER.md) · [API](docs/API.md) · [Architecture](docs/ARCHITECTURE.md) · [Brand kit](brand/index.html) · [Roadmap](roadmap.md) · [Contributing](.github/CONTRIBUTING.md) · [Security](.github/SECURITY.md)

<img src="architecture.svg" width="600">

## License

Apache License 2.0. Copyright 2026 Joshua Trommel. The Talli Display font is under the SIL Open Font License (`fonts/OFL.txt`).
