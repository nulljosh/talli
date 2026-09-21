Note: r/webdev. No hard karma gate found. Frame as "I built X to solve Y", not an ad. Public post, web app is live.

Title: I built a tool to solve a government portal problem: when does my disability payment land

Body:
BC's income assistance portal, Self-Serve, has no public API and no simple way to answer "when does the money come, and how much." So I built Talli, a small web app that logs in on the user's behalf with a Puppeteer scraper, pulls payments, messages, and PWD/DTC application status into structured JSON, and shows it as a dashboard: payment countdown, a bar chart of recent payments, application timelines, and a filing-window banner for the first five days of each month.

No framework, vanilla HTML/CSS/JS, because a dashboard this size didn't need one. Express API on Vercel serverless, Vercel Blob for persistence, and a `visibilityInterval()` helper that pauses all polling when the tab is hidden so a backgrounded tab doesn't burn serverless invocations. It's also a PWA with offline mode, so a payment date is still visible without signal, and it's translated into English, French, Chinese and Punjabi from one source.

Free, always, for the people who need it. Live at talli.heyitsmejosh.com, source on GitHub. Curious how others have handled scraping a portal with no API without it turning into a maintenance nightmare.
