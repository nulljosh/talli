# Directory listings

Reused across the submit-once directories. Talli: free, live on web and the App Store (iOS, macOS, watchOS).

Name: Talli
One-liner: Disability assistance payments and applications, tracked in one place.
Description: Talli reads BC's Self-Serve portal for you and shows income assistance payments, a countdown to the next payment, PWD and DTC application status, and government messages in one dashboard. It files the monthly report for you too. Free, always, for the people who rely on it.
Category: Finance / Utilities / Health & Disability
Links: Web talli.heyitsmejosh.com · App Store apps.apple.com/app/talli/id6782366555 · GitHub github.com/nulljosh/talli

## Where this goes

- **AlternativeTo**: list under "personal finance" / "government services", same description above.
- **Indie Hackers (products)**: same listing, add the maker note from the Product Hunt first comment.
- **BetaList**: skip. Talli is already live on web and the App Store, not pre-launch.
- **Uneed**: same listing.
- **SaaSHub**: same listing, category Finance.
- **dev.to**: build-story post, technical hook below.

## dev.to build-story hook

BC Self-Serve has no public API, so Talli's core is a Puppeteer scraper (`src/scraper.js`) that logs in with the user's BCeID and extracts payments, messages, and application status into structured JSON, with credentials session-encrypted and never written to disk in plaintext. On top of that: a `visibilityInterval()` helper pauses all API polling when the tab is hidden, and one master string source generates both the web i18next bundle and the Xcode String Catalog for English, French, Chinese and Punjabi, so the translations never drift between the web app and the iOS build. Worth a post on scraping a portal with no API safely, and running one string source across a web and a native app.
