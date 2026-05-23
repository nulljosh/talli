#!/usr/bin/env node
/**
 * Scrape BC Self-Serve via Puppeteer and upload results to Vercel Blob.
 * Designed to run as a cron job on the Mac Mini.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const fs = require('fs');

async function main() {
  const username = process.env.BCEID_USERNAME;
  const password = process.env.BCEID_PASSWORD;

  if (!username || !password) {
    console.error('[sync] Missing BCEID credentials in .env');
    process.exit(1);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[sync] Missing BLOB_READ_WRITE_TOKEN in .env');
    process.exit(1);
  }

  const userId = crypto.createHash('sha256').update(username).digest('hex').slice(0, 16);
  const secret = process.env.SESSION_SECRET || '';
  const hmac = crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 12);
  const blobPath = `tally-cache/${hmac}-${userId}/results.json`;

  // Run Puppeteer scraper
  console.log('[sync] Starting Puppeteer scrape...');
  const { checkAllSections } = require('../src/scraper');
  const result = await checkAllSections(username, password);

  if (!result || !result.success) {
    console.error('[sync] Scrape failed:', result?.error || 'unknown');
    process.exit(1);
  }

  result.checkedAt = new Date().toISOString();
  console.log('[sync] Scrape succeeded. Sections:', Object.keys(result.sections).join(', '));

  // Save locally
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const localPath = path.join(dataDir, `results-${result.checkedAt.replace(/:/g, '-')}.json`);
  fs.writeFileSync(localPath, JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(dataDir, 'results-latest.json'), JSON.stringify(result, null, 2));
  console.log('[sync] Saved locally:', localPath);

  // Upload to Vercel Blob
  const { put } = require('@vercel/blob');
  const blobResult = await put(
    blobPath,
    JSON.stringify(result),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    }
  );

  console.log('[sync] Uploaded to Blob:', blobResult.url);
  console.log('[sync] Done.');
}

main().catch(err => {
  console.error('[sync] Fatal:', err.message);
  process.exit(1);
});
