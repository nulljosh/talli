# School
v1.2.0
## Rules
- Portfolio aesthetic: `rgba()` tokens, `-apple-system` font, `clamp()` sizing, auto dark/light
- All CSS/JS inline in `web/school.html`
- Data flow: `grades.py` -> `data/grades.json` -> `school-grades.js` -> `server.js` -> `school.html`
- No emojis
## Run
```bash
npm install && npm start
npm run refresh
npm test
cd tools && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
python tools/scrape_pdfs.py submit
cd tools/solver && python app.py
```
Deploy: Vercel. URL: school.heyitsmejosh.com
## Key Files
- `grades.py` - Scrapes D2L grades and writes the normalized output.
- `data/grades.json` - Cached grades data consumed by the web layer.
- `school-grades.js` - Client-side adapter that formats grades for the UI.
- `server.js` - Express server that serves the dashboard and grade data.
- `web/school.html` - Single-file UI with inline CSS and JS.
