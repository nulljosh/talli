#!/usr/bin/env node
// i18n-mt: fill empty non-en values in strings.json via DeepL.
// SKIPS any key with review:true (finance/health stay human-authored).
// DeepL key from macOS Keychain, never plaintext:
//   security add-generic-password -s deepl-api -a talli -w <KEY>
//   node scripts/i18n-mt.mjs        # writes back into i18n/strings.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(root, "i18n/strings.json");
const src = JSON.parse(readFileSync(path, "utf8"));
const { sourceLanguage, locales } = src._meta;

let key;
try {
  key = execFileSync("security", ["find-generic-password", "-s", "deepl-api", "-a", "talli", "-w"], { encoding: "utf8" }).trim();
} catch {
  console.error("No DeepL key in Keychain. Add: security add-generic-password -s deepl-api -a talli -w <KEY>");
  process.exit(1);
}

const DEEPL = { fr: "FR", zh: "ZH", pa: null }; // DeepL has no Punjabi target -> stays for human translation
async function tr(text, target) {
  const body = new URLSearchParams({ text, target_lang: target, source_lang: sourceLanguage.toUpperCase() });
  const r = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}`);
  return (await r.json()).translations[0].text;
}

let filled = 0, skipped = 0;
for (const k of Object.keys(src)) {
  if (k === "_meta") continue;
  if (src[k].review) { skipped++; continue; }
  for (const lng of locales) {
    if (lng === sourceLanguage || !DEEPL[lng]) continue;
    if (src[k][lng] && src[k][lng].length) continue;
    src[k][lng] = await tr(src[k][sourceLanguage], DEEPL[lng]);
    filled++;
  }
}
writeFileSync(path, JSON.stringify(src, null, 2) + "\n");
console.log(`i18n-mt: filled ${filled}, skipped ${skipped} review-flagged keys. Run i18n-gen next.`);
