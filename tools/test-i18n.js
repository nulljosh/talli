const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// In-process tests for the i18n pipeline:
//   - i18n/strings.json master source validity
//   - generated web/locales/*.json + ios/Talli/Localizable.xcstrings (correct + not stale)
//   - web/js/i18n.js runtime: real t() fallback + Intl currency/date/number formatting

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));

const src = readJSON('i18n/strings.json');
const { sourceLanguage, locales } = src._meta;
const keys = Object.keys(src).filter((k) => k !== '_meta');

// Mirror of the generator mapping (scripts/i18n-gen.mjs) so we can detect drift.
function expectedWeb(lng) {
  const out = {};
  for (const k of keys) {
    const v = src[k][lng];
    if (lng === sourceLanguage || (v && v.length)) out[k] = v || src[k][sourceLanguage];
  }
  return out;
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  [OK] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [FAIL] ${name}: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('i18n Pipeline Tests\n');

  // --- Group A: master source validity ---
  await test('strings.json: _meta source is en, locales en/fr/zh/pa', () => {
    assert.strictEqual(sourceLanguage, 'en');
    assert.deepStrictEqual(locales, ['en', 'fr', 'zh', 'pa']);
  });

  await test('strings.json: every key has a non-empty en value', () => {
    for (const k of keys) {
      assert.ok(src[k].en && src[k].en.length, `${k} missing en`);
    }
  });

  await test('strings.json: every locale value is a string', () => {
    for (const k of keys) {
      for (const lng of locales) {
        const v = src[k][lng];
        if (v !== undefined) assert.strictEqual(typeof v, 'string', `${k}.${lng} not a string`);
      }
    }
  });

  await test('strings.json: review-flagged keys exist (human-review contract)', () => {
    const flagged = keys.filter((k) => src[k].review === true);
    assert.ok(flagged.length > 0, 'expected at least one review:true key');
    // a flagged benefit string may legitimately have empty zh/pa -> en fallback
    assert.ok(keys.includes('report.fileNow') && src['report.fileNow'].review === true);
  });

  // --- Group B: generated output / drift ---
  await test('web/locales/en.json: all keys, values match source', () => {
    const en = readJSON('web/locales/en.json');
    assert.strictEqual(Object.keys(en).length, keys.length);
    for (const k of keys) assert.strictEqual(en[k], src[k].en);
  });

  await test('web/locales/fr.json: full (fr authored for every key)', () => {
    const fr = readJSON('web/locales/fr.json');
    assert.strictEqual(Object.keys(fr).length, keys.length);
    assert.deepStrictEqual(fr, expectedWeb('fr'));
  });

  await test('web/locales/zh.json + pa.json: only non-empty keys (drift check)', () => {
    assert.deepStrictEqual(readJSON('web/locales/zh.json'), expectedWeb('zh'));
    assert.deepStrictEqual(readJSON('web/locales/pa.json'), expectedWeb('pa'));
  });

  await test('zh.json omits review-empty key report.fileNow (en-fallback path)', () => {
    const zh = readJSON('web/locales/zh.json');
    assert.ok(!('report.fileNow' in zh), 'report.fileNow should be absent in zh');
  });

  await test('every zh key has an en fallback target', () => {
    const zh = readJSON('web/locales/zh.json');
    const en = readJSON('web/locales/en.json');
    for (const k of Object.keys(zh)) assert.ok(k in en, `${k} missing en fallback`);
  });

  await test('Localizable.xcstrings: valid, en source, no drift, fr/zh state', () => {
    const cat = readJSON('ios/Talli/Localizable.xcstrings');
    assert.strictEqual(cat.sourceLanguage, 'en');
    assert.strictEqual(cat.version, '1.0');
    assert.strictEqual(Object.keys(cat.strings).length, keys.length);
    for (const k of keys) {
      assert.strictEqual(cat.strings[k].localizations.en.stringUnit.value, src[k].en, `${k} en drift`);
    }
    assert.strictEqual(cat.strings['report.fileNow'].localizations.fr.stringUnit.value, src['report.fileNow'].fr);
    assert.ok(!cat.strings['report.fileNow'].localizations.zh, 'zh should be omitted for review-empty key');
  });

  // --- Group C: runtime (real web/js/i18n.js in a mocked browser sandbox) ---
  await test('i18n.js: real runtime t() fallback + Intl formatters', async () => {
    const i18nSrc = read('web/js/i18n.js');
    const store = {};
    const localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    };
    const fetchMock = async (url) => {
      const lng = String(url).match(/\/locales\/(\w+)\.json/)[1];
      const body = read(`web/locales/${lng}.json`);
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    };
    const sandbox = {
      window: { addEventListener() {}, dispatchEvent() {} },
      document: {
        readyState: 'complete',
        documentElement: {},
        addEventListener() {},
        querySelectorAll: () => [],
      },
      navigator: { language: 'en' },
      localStorage,
      fetch: fetchMock,
      CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o); } },
      Intl, console, setTimeout, Promise,
    };
    vm.runInNewContext(i18nSrc, sandbox);
    const I18N = sandbox.window.I18N;
    assert.ok(I18N, 'window.I18N not exposed');
    for (const fn of ['t', 'setLang', 'fmtMoney', 'fmtDate', 'fmtNum']) {
      assert.strictEqual(typeof I18N[fn], 'function', `I18N.${fn} missing`);
    }
    // let async boot (fallback + active dict load) settle
    await new Promise((r) => setTimeout(r, 20));

    assert.strictEqual(I18N.t('nav.account'), 'Account', 'default en t()');
    assert.strictEqual(I18N.t('totalli.unknown.key'), 'totalli.unknown.key', 'unknown key passthrough');

    await I18N.setLang('fr');
    assert.strictEqual(I18N.t('nav.account'), 'Compte', 'fr t()');

    await I18N.setLang('zh');
    assert.strictEqual(I18N.t('nav.account'), '账户', 'zh present');
    assert.strictEqual(I18N.t('report.fileNow'), 'File now', 'zh missing -> en fallback');

    // formatters: the part translation can never do
    await I18N.setLang('en');
    const enMoney = I18N.fmtMoney(1000);
    assert.ok(enMoney.includes('$') && enMoney.includes('1,000'), `en money: ${enMoney}`);
    assert.ok(I18N.fmtDate(new Date('2026-05-29T12:00:00')).includes('May'), 'en date month');

    await I18N.setLang('fr');
    const frMoney = I18N.fmtMoney(1000);
    // fr-CA renders CAD as "1 000,00 $CA": comma decimal, $ symbol, differs from en
    assert.ok(frMoney.includes('$') && frMoney.includes(',00'), `fr money: ${frMoney}`);
    assert.notStrictEqual(frMoney, enMoney, 'fr money must differ from en');
    assert.ok(I18N.fmtDate(new Date('2026-05-29T12:00:00')).includes('mai'), 'fr date month');
    assert.notStrictEqual(I18N.fmtNum(1000), '1,000', 'fr number grouping differs from en');
  });

  // run the one async test before reporting
}

// The async runtime test needs awaiting; wrap the whole harness.
(async () => {
  // Re-run with async support: collect sync tests, then the async one.
  await main();
  // main() registered sync tests synchronously but the async test() callback
  // returns a promise that test() does not await, so run it explicitly here.
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
