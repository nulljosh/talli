# School — Plan

## Quick Wins
- [ ] Standardize folder structure across all subjects — each subject same layout

## Medium
- [ ] Fix Vercel deployment — 404 NOT_FOUND at school.heyitsmejosh.com

## Big
- [ ] Build interactive quizzes from school material (notebookLM style — we've built these before in Claude)
- [ ] Build native cross-platform apps (iOS + macOS)

## UVic Application Tracker

Add a UVic/university application tracker view. Data source: UVic Registrar portal (Puppeteer scrape, credentials provided by user).

**Current application data (as of 2026-04-12):**
- Student: Joshua Trommel (V01122835)
- Program: Computer Science (BSc), First Term Sep–Dec 2026
- Submitted: Apr 06 2026 — Status: Application submitted

**Application checklist to track:**
| Requirement | Due date | Status | Notes |
|---|---|---|---|
| App Fee Canada UG | — | Pending | EPBC Application Fee: $87.75 |
| Second Program Choice | — | Submitted | Business |
| High School Transcript (Final) | **Apr 23 2026** | Pending | Brookswood Secondary |

**To do:**
- [ ] Build Puppeteer scraper for UVic Registrar portal (user will provide credentials)
- [ ] Parse checklist table: requirement, due date, received status, description
- [ ] Store in local JSON or Supabase
- [ ] Add "University Applications" view/section in school web app
- [ ] Surface deadlines prominently (transcript due Apr 23 2026 is imminent)
- [ ] Propagate to iOS + macOS school apps
