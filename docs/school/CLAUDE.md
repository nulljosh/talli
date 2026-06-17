# school — Claude Notes

## Overview
Static single-page dashboard (`index.html`) showing university status, active courses, finished courses, and timeline. Source data is manually edited here; the `school-ios` template app (in `ios/`) expects `/api/grades` and `/api/quizzes` endpoints that don't exist yet — there is no live grade sync.

## Dev
```bash
cd docs/school
open index.html
```

## Deploy
```bash
vercel --prod
```

## Status
Live at school.heyitsmejosh.com. Pre-Calculus 12 and English Studies 12 finished; A&P 12 in progress.
