Note: r/iOSProgramming. "Show and Tell" flair required. Weekly self-promo thread is the safer route; check the pinned thread before a standalone post. Public post, app is live on the App Store.

Title: Native iOS companion for a benefits tracker, with a Core Graphics avatar and WebMCP tools

Body:
Talli is a payment and benefits tracker for people on BC income assistance. The core is a web app that scrapes BC's Self-Serve portal (no public API exists), but I built a native iOS companion so the payment countdown and government messages are one tap away instead of a browser bookmark.

The iOS app mirrors the web's parchment palette and orange accent, with a pixel-art avatar drawn entirely in Core Graphics instead of a static asset. It also registers WebMCP tools on the web side so an agent can read benefit status and payments, and file the monthly report with the user's say-so. Credentials never pass through a tool, and no tool ever touches the PIN, that's enforced by a test that runs first in CI.

Four tabs (Home, Calendar, Status, Messages), dark mode following the system, i18n across English, French, Chinese and Punjabi from one shared string source that also feeds the web bundle.

Free app, live on the App Store. Would love feedback from anyone who's built a scraper-backed companion app, especially around session handling and keeping credentials off disk.
