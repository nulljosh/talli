// No custom face ships anywhere: every amount, heading and label is the system font (Joshua 2026-11-01, Talli Display
// read as stretched). Fails if a webfont, a bundled TTF or the old face's name comes back into the web or Apple builds.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
for (const f of ['web/landing.css', 'web/landing.html', 'web/unified.html', 'ios/project.yml', 'macos/project.yml']) {
  const s = read(f);
  assert(!/TalliDisplay|Talli Display/.test(s), `${f} still names Talli Display`);
  assert(!/@font-face/.test(s), `${f} declares a webfont`);
}
assert(!fs.existsSync(path.join(root, 'web/fonts/TalliDisplay-Semibold.woff2')), 'the old woff2 is still shipped');
console.log('font ok: system font only');
