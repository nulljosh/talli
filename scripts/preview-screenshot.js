#!/usr/bin/env node
// preview-screenshot.js -- spawn tally locally, log in via auto-login, capture
// the dashboard at iPhone 17 Pro dimensions, write to web/preview.png and copy
// to the portfolio repo.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const os = require('os');
const puppeteer = require('puppeteer-core');

// Load BCeID creds from ~/.config/tally/credentials.env (mode 600, never committed)
// so the screenshot can authenticate against the real account.
function loadCreds() {
  const file = path.join(os.homedir(), '.config', 'tally', 'credentials.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const REPO_ROOT = path.resolve(__dirname, '..');
// Repo-root, not web/, because web/ is gitignored.
const OUT_REPO = path.join(REPO_ROOT, 'preview.png');
const OUT_PORTFOLIO = path.resolve(
  process.env.HOME,
  'Documents/Code/nulljosh.github.io/images/tally-preview.png'
);
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIEWPORT = { width: 402, height: 874, deviceScaleFactor: 3 };
const NAV_TIMEOUT_MS = 30000;
const DATA_LOAD_TIMEOUT_MS = 90000;
const FINAL_PAINT_MS = 1500;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const sock = net.connect(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() > deadline) return reject(new Error('tally server did not start in time'));
        setTimeout(tick, 200);
      });
    };
    tick();
  });
}

(async () => {
  const port = await getFreePort();
  console.log(`[preview] starting tally on port ${port}`);

  const creds = loadCreds();
  const env = {
    ...process.env,
    PORT: String(port),
    BCEID_USERNAME: process.env.BCEID_USERNAME || creds.BCEID_USERNAME || 'preview_user',
    BCEID_PASSWORD: process.env.BCEID_PASSWORD || creds.BCEID_PASSWORD || 'preview_pass',
    SESSION_SECRET: process.env.SESSION_SECRET || creds.SESSION_SECRET || 'preview-screenshot-secret',
    NODE_ENV: 'development',
  };
  delete env.VERCEL;
  console.log(`[preview] auth as ${env.BCEID_USERNAME}`);

  const server = spawn('node', ['src/api.js'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (b) => process.stdout.write(`[tally] ${b}`));
  server.stderr.on('data', (b) => process.stderr.write(`[tally] ${b}`));

  const cleanup = () => { try { server.kill('SIGTERM'); } catch {} };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  try {
    await waitForServer(port);
    console.log('[preview] server up, launching chrome');

    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: 'new',
      defaultViewport: VIEWPORT,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);

      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT_MS,
      });

      const url = page.url();
      if (url.includes('/login')) {
        throw new Error(`auto-login failed, ended at ${url}`);
      }

      await page.waitForSelector('#payment-info', { timeout: NAV_TIMEOUT_MS });

      // Wait until the payment-info card no longer shows the .loading spinner
      // (data fetch finished, success or fail). Falls through if it never settles.
      try {
        await page.waitForFunction(
          () => {
            const el = document.querySelector('#payment-info');
            return !!el && !el.querySelector('.loading');
          },
          { timeout: DATA_LOAD_TIMEOUT_MS, polling: 250 }
        );
        console.log('[preview] dashboard data loaded');
      } catch {
        console.warn('[preview] data load timed out, capturing anyway');
      }

      // Tiny extra paint window so any post-data layout shifts settle
      await new Promise((r) => setTimeout(r, FINAL_PAINT_MS));

      fs.mkdirSync(path.dirname(OUT_REPO), { recursive: true });
      await page.screenshot({ path: OUT_REPO, omitBackground: false });
      console.log(`[preview] wrote ${OUT_REPO}`);

      fs.mkdirSync(path.dirname(OUT_PORTFOLIO), { recursive: true });
      fs.copyFileSync(OUT_REPO, OUT_PORTFOLIO);
      console.log(`[preview] mirrored to ${OUT_PORTFOLIO}`);
    } finally {
      await browser.close();
    }
  } finally {
    cleanup();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
