#!/usr/bin/env node
// i18n-gen: one master string source -> web i18next JSON + Xcode String Catalog.
// Keeps web and native from drifting. Zero deps.
//   node scripts/i18n-gen.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(readFileSync(resolve(root, "i18n/strings.json"), "utf8"));
const { sourceLanguage, locales } = src._meta;
const keys = Object.keys(src).filter((k) => k !== "_meta");

// --- Web: one resource file per locale (en always full; others only translated keys) ---
const webDir = resolve(root, "web/locales");
mkdirSync(webDir, { recursive: true });
for (const lng of locales) {
  const out = {};
  for (const k of keys) {
    const v = src[k][lng];
    if (lng === sourceLanguage || (v && v.length)) out[k] = v || src[k][sourceLanguage];
  }
  writeFileSync(resolve(webDir, `${lng}.json`), JSON.stringify(out, null, 2) + "\n");
}

// --- Native: Xcode String Catalog (.xcstrings) ---
const strings = {};
for (const k of keys) {
  const localizations = {};
  for (const lng of locales) {
    const v = src[k][lng];
    if (lng === sourceLanguage) {
      localizations[lng] = { stringUnit: { state: "translated", value: src[k][sourceLanguage] } };
    } else if (v && v.length) {
      localizations[lng] = { stringUnit: { state: "translated", value: v } };
    } // missing -> omitted, Xcode shows as needs-translation
  }
  strings[k] = { extractionState: "manual", localizations };
}
const catalog = { sourceLanguage, strings, version: "1.0" };
const catDir = resolve(root, "ios/Talli");
mkdirSync(catDir, { recursive: true });
writeFileSync(resolve(catDir, "Localizable.xcstrings"), JSON.stringify(catalog, null, 2) + "\n");

const translated = (lng) => keys.filter((k) => lng === sourceLanguage || (src[k][lng] && src[k][lng].length)).length;
console.log(`i18n-gen: ${keys.length} keys -> web/locales/*.json + ios/Talli/Localizable.xcstrings`);
for (const lng of locales) console.log(`  ${lng}: ${translated(lng)}/${keys.length} translated`);
