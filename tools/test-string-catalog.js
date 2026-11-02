// Every string in the iOS/Mac String Catalog has French, Chinese and Punjabi, so a new screen cannot ship English-only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../ios/Talli/Localizable.xcstrings'), 'utf8'));
const missing = [];
for (const [key, entry] of Object.entries(catalog.strings)) {
  if (entry.shouldTranslate === false || key.trim() === '') continue;
  for (const lang of ['fr', 'zh', 'pa']) {
    const l = entry.localizations?.[lang];
    const done = l?.variations || ['translated', 'reviewed'].includes(l?.stringUnit?.state);
    if (!done || (l.stringUnit && !l.stringUnit.value)) missing.push(`${lang}: ${key}`);
  }
}
assert.deepStrictEqual(missing, [], `untranslated strings:\n${missing.join('\n')}`);
console.log(`string catalog: ${Object.keys(catalog.strings).length} strings in fr, zh and pa`);
