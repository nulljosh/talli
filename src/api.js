const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const { checkAllSections, runSubmitMonthlyReport, getAuthenticatedCookies } = require('./scraper');
const { createCorsOptionsDelegate, parseAllowedOrigins } = require('./cors-utils');
const { parseCookies, unsealAuthPayload, setAuthCookie, clearAuthCookie } = require('./auth-cookie');
const { attemptHttpLogin, fetchAllSections } = require('./http-scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = !!process.env.VERCEL;

// Fail fast if SESSION_SECRET missing in production
if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production. Refusing to start with random key.');
}
const ENCRYPTION_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const PWD_APPROVED = process.env.PWD_APPROVED === 'true';
const DEFAULT_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const LIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const liveCache = new Map();

// Debug logging helper
const log = (...args) => DEBUG && console.log(...args);

function getUaHash(req) {
  return crypto.createHash('sha256').update(req.headers['user-agent'] || '').digest('hex');
}

function deriveUserId(username) {
  return crypto.createHash('sha256').update(username).digest('hex').slice(0, 16);
}

function getSessionMaxAgeMs(req) {
  const maxAgeMs = Number(req?.session?.cookie?.maxAge);
  if (Number.isFinite(maxAgeMs) && maxAgeMs > 0) return maxAgeMs;
  return DEFAULT_SESSION_MAX_AGE_MS;
}

function persistAuthCookie(req, res) {
  if (!req?.session?.authenticated || !process.env.SESSION_SECRET) return;
  const maxAgeMs = getSessionMaxAgeMs(req);
  const payload = {
    authenticated: true,
    bceidUsername: req.session.bceidUsername,
    bceidPassword: req.session.bceidPassword,
    craProfile: req.session.craProfile,
    userId: req.session.userId,
    uaHash: req.session.uaHash,
    paidStatus: req.session.paidStatus || null,
    lastActivity: req.session.lastActivity || Date.now(),
    maxAgeMs,
    exp: Date.now() + maxAgeMs
  };
  setAuthCookie(res, payload, ENCRYPTION_KEY, {
    maxAgeMs,
    secure: IS_PRODUCTION,
    httpOnly: true,
    sameSite: 'Strict',
    path: '/'
  });
}

function clearAllAuthState(req, res, done) {
  clearAuthCookie(res, {
    secure: IS_PRODUCTION,
    httpOnly: true,
    sameSite: 'Strict',
    path: '/'
  });
  if (!req.session) {
    if (typeof done === 'function') done();
    return;
  }
  req.session.destroy((err) => {
    if (typeof done === 'function') done(err);
  });
}

// Encryption helpers for session credential storage
const DERIVED_SALT = crypto.createHash('sha256').update(ENCRYPTION_KEY + 'tally-salt').digest().slice(0, 16);
const DERIVED_KEY = crypto.scryptSync(ENCRYPTION_KEY, DERIVED_SALT, 32);

function encrypt(text) {
  if (!text) return '';
  const algorithm = 'aes-256-cbc';
  const key = DERIVED_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted) {
  if (!encrypted) return '';
  const algorithm = 'aes-256-cbc';
  const key = DERIVED_KEY;
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || path.join(__dirname, '..'),
      env: { ...process.env, ...(options.env || {}) }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
      }
    });
  });
}

function getCraProfile(req) {
  const profile = req.session?.craProfile || null;
  if (!profile) return null;
  return {
    connected: true,
    displayName: profile.displayName || 'CRA account',
    signInMethod: profile.signInMethod || 'CRA user ID and password',
    taxYear: profile.taxYear || String(new Date().getFullYear() - 1),
    province: profile.province || 'BC',
    lastConnectedAt: profile.lastConnectedAt || null
  };
}

function getCraArtifacts() {
  const dataDir = path.join(__dirname, '../data');
  const artifacts = [];
  const files = [
    {
      label: 'Filled T2201 draft',
      pathname: '/data/dtc_filled.pdf',
      filePath: path.join(dataDir, 'dtc_filled.pdf')
    },
    {
      label: 'Blank T2201 form',
      pathname: '/data/t2201_blank.pdf',
      filePath: path.join(dataDir, 't2201_blank.pdf')
    }
  ];

  for (const file of files) {
    if (!fs.existsSync(file.filePath)) continue;
    const stat = fs.statSync(file.filePath);
    artifacts.push({
      label: file.label,
      path: file.pathname,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size
    });
  }

  return artifacts;
}

async function prepareDtcDraft({ legalName, sin, dob, submit }) {
  const env = {};
  if (legalName) env.LEGAL_NAME = legalName;
  if (sin) env.SIN = sin;
  if (dob) env.DOB = dob;

  const args = ['tools/dtc_apply.py'];
  if (submit) args.push('--submit');

  const { stdout, stderr } = await runCommand('python3', args, { env });
  return {
    success: true,
    output: `${stdout}${stderr}`.trim(),
    artifacts: getCraArtifacts()
  };
}

function isPuppeteerUnavailableError(error) {
  return /Puppeteer auth unavailable/i.test(error?.message || '');
}

async function getHybridAuthCookies(username, password) {
  return getAuthenticatedCookies({
    username,
    password,
    headless: true
  });
}

// Map internal scraper errors to user-facing messages
function userFacingLoginError(internalError) {
  const msg = String(internalError || '').toLowerCase();
  if (msg.includes('invalid bceid credentials') ||
      msg.includes('login appears to have returned to the login page')) {
    return 'Invalid credentials. Please check your BCeID username and password.';
  }
  if (msg.includes('session expired')) {
    return 'Session expired. Please sign in again.';
  }
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('fetch failed') ||
      msg.includes('http 50') || msg.includes('http 429')) {
    return 'Connection to BC Self-Serve timed out. Please try again.';
  }
  if (msg.includes('login form not found') || msg.includes('sign in link not found')) {
    return 'BC Self-Serve is temporarily unavailable. Please try again later.';
  }
  if (msg.includes('redirect loop')) {
    return 'BC Self-Serve login encountered an error. Please try again.';
  }
  if (msg.includes('smsession cookie not found')) {
    return 'Invalid credentials. Please check your BCeID username and password.';
  }
  return 'Unable to sign in. Please check your credentials and try again.';
}

function safeApiError(error, fallback) {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('session expired') || msg.includes('login page')) {
    return 'Session expired. Please sign in again.';
  }
  return fallback;
}

function isServiceUnavailableError(userFacingMsg) {
  const msg = String(userFacingMsg || '').toLowerCase();
  return msg.includes('temporarily unavailable') || msg.includes('timed out') || msg.includes('encountered an error');
}

// Validate BC Self-Serve credentials with Puppeteer auth + HTTP fallback
async function attemptBCLogin(username, password) {
  if (!username || !password) return { success: false, error: 'Credentials required' };

  // On Vercel, skip Puppeteer entirely -- it will never work (function size limits)
  if (IS_PRODUCTION) {
    log(`[LOGIN] Vercel: using HTTP-only auth`);
    const result = await attemptHttpLogin(username, password);
    if (result?.success) return { success: true };
    const internalError = result?.error || 'HTTP-only login failed';
    log(`[LOGIN] HTTP auth failed: ${internalError}`);
    return { success: false, error: userFacingLoginError(internalError) };
  }

  try {
    await getHybridAuthCookies(username, password);
    return { success: true };
  } catch (error) {
    if (!isPuppeteerUnavailableError(error)) {
      log(`[LOGIN] Auth error: ${error.message}`);
      return { success: false, error: userFacingLoginError(error.message) };
    }

    log(`[LOGIN] Puppeteer unavailable, trying HTTP fallback`);
    const fallbackResult = await attemptHttpLogin(username, password);
    if (fallbackResult?.success) return { success: true };
    const internalError = fallbackResult?.error || 'HTTP-only login failed';
    log(`[LOGIN] HTTP fallback failed: ${internalError}`);
    return {
      success: false,
      error: userFacingLoginError(internalError)
    };
  }
}

async function fetchAllSectionsWithHybridAuth(username, password) {
  // On Vercel, skip Puppeteer entirely -- it will never work (function size limits)
  if (IS_PRODUCTION) {
    log(`[SCRAPE] Vercel: using HTTP-only scrape`);
    const result = await fetchAllSections({ username, password });
    if (result?.success) return result;
    const internalError = result?.error || 'HTTP-only scrape failed';
    log(`[SCRAPE] HTTP scrape failed: ${internalError}`);
    return { success: false, error: userFacingLoginError(internalError) };
  }

  try {
    const { cookies } = await getHybridAuthCookies(username, password);
    return await fetchAllSections({ cookies });
  } catch (error) {
    if (!isPuppeteerUnavailableError(error)) {
      log(`[SCRAPE] Auth error: ${error.message}`);
      return { success: false, error: userFacingLoginError(error.message) };
    }

    log(`[SCRAPE] Puppeteer unavailable, trying HTTP fallback`);
    const fallbackResult = await fetchAllSections({ username, password });
    if (fallbackResult?.success) return fallbackResult;

    const internalError = fallbackResult?.error || 'HTTP-only login failed';
    log(`[SCRAPE] HTTP fallback failed: ${internalError}`);
    return {
      success: false,
      error: userFacingLoginError(internalError)
    };
  }
}

const allowedOrigins = parseAllowedOrigins(
  process.env.CORS_ORIGINS,
  'http://localhost:3000,http://127.0.0.1:3000,https://tally-production.vercel.app,https://tally.heyitsmejosh.com'
);

app.use(cors(createCorsOptionsDelegate(allowedOrigins)));
app.use(express.json());
app.set('trust proxy', 1);

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for CPU-intensive scrape/submit operations
const scrapeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 scrapes per hour
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(session({
  secret: ENCRYPTION_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PRODUCTION, // HTTPS-only on Vercel, HTTP OK on localhost
    httpOnly: true,
    sameSite: 'strict',
    maxAge: DEFAULT_SESSION_MAX_AGE_MS
  }
  // No store needed - defaults to MemoryStore locally, cookies on Vercel serverless
}));

if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  console.error('[CRITICAL] SESSION_SECRET is missing in production. Sessions will not persist across deploys. Set SESSION_SECRET in environment variables.');
} else if (!process.env.SESSION_SECRET) {
  log('[SESSION] Using random session secret (development mode). Sessions reset on restart.');
}

// Rehydrate server session from encrypted auth cookie (serverless-safe fallback)
app.use((req, res, next) => {
  if (req.session?.authenticated) return next();
  if (!process.env.SESSION_SECRET) return next();

  const cookies = parseCookies(req.headers.cookie);
  const authToken = cookies.tally_auth;
  if (!authToken) return next();

  const payload = unsealAuthPayload(authToken, ENCRYPTION_KEY);
  if (!payload || !payload.authenticated) {
    clearAuthCookie(res, { secure: IS_PRODUCTION, httpOnly: true, sameSite: 'Strict', path: '/' });
    return next();
  }

  if (payload.exp && Date.now() > payload.exp) {
    clearAuthCookie(res, { secure: IS_PRODUCTION, httpOnly: true, sameSite: 'Strict', path: '/' });
    return next();
  }

  const currentUaHash = getUaHash(req);
  if (payload.uaHash && payload.uaHash !== currentUaHash) {
    clearAuthCookie(res, { secure: IS_PRODUCTION, httpOnly: true, sameSite: 'Strict', path: '/' });
    return next();
  }

  req.session.authenticated = true;
  req.session.bceidUsername = payload.bceidUsername;
  req.session.bceidPassword = payload.bceidPassword;
  req.session.craProfile = payload.craProfile;
  req.session.userId = payload.userId;
  req.session.paidStatus = payload.paidStatus || null;
  req.session.lastActivity = payload.lastActivity || Date.now();
  req.session.uaHash = payload.uaHash || currentUaHash;
  req.session.cookie.maxAge = Number(payload.maxAgeMs) || DEFAULT_SESSION_MAX_AGE_MS;
  return next();
});

// Session timeout middleware
app.use((req, res, next) => {
  if (req.session && req.session.authenticated) {
    const lastActivity = req.session.lastActivity || Date.now();
    const now = Date.now();
    const timeout = SESSION_IDLE_TIMEOUT_MS;

    if (now - lastActivity > timeout) {
      return clearAllAuthState(req, res, () => {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
      });
    }

    req.session.lastActivity = now;
    persistAuthCookie(req, res);
  }
  next();
});

// CSRF origin check -- derives from the same CORS allowedOrigins list
const ALLOWED_ORIGINS = new Set(allowedOrigins);
if (process.env.VERCEL_URL) ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_URL}`);

app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.headers.origin;
  if (origin) {
    if (ALLOWED_ORIGINS.has(origin)) return next();
    log(`[CSRF] Blocked request from origin: ${origin}`);
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // No Origin header -- check Referer as fallback (iOS apps, curl won't have either)
  const referer = req.headers.referer;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) return next();
      log(`[CSRF] Blocked request from referer: ${referer}`);
      return res.status(403).json({ error: 'Origin not allowed' });
    } catch { /* invalid referer URL, fall through */ }
  }
  // No Origin or Referer -- allow for non-browser clients (iOS native, curl, cron)
  // These are protected by session auth + cookie SameSite=Strict
  return next();
});

// Security headers (precomputed at startup)
const CSP_HEADER = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://myselfserve.gov.bc.ca; frame-ancestors 'none'";
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', CSP_HEADER);
  }
  next();
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    // Session fingerprint check — detect token theft
    if (req.session.uaHash) {
      const currentUaHash = getUaHash(req);
      if (currentUaHash !== req.session.uaHash) {
        return clearAllAuthState(req, res, () => {
          return res.status(401).json({ error: 'Session invalid. Please login again.' });
        });
      }
    }
    next();
  } else {
    res.status(401).sendFile(path.join(__dirname, '../web/login.html'));
  }
};

// Lightweight session check -- no BC Self-Serve roundtrip
app.get('/api/session-check', (req, res) => {
  if (req.session?.authenticated) {
    return res.json({ authenticated: true, userId: req.session.userId });
  }
  return res.status(401).json({ authenticated: false });
});

// Login endpoint - validate BC Self-Serve credentials
app.post('/api/login', loginLimiter, async (req, res) => {
  let { username, password, rememberMe } = req.body;
  let usedLocalEnvFallback = false;

  // Input validation
  if (username && (typeof username !== 'string' || username.length > 200)) {
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }
  if (password && (typeof password !== 'string' || password.length > 200)) {
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }
  if (username) username = username.trim();
  if (password) password = password.trim();

  // Local-only convenience: allow empty login to use .env credentials
  if ((!username || !password) && !process.env.VERCEL) {
    username = process.env.BCEID_USERNAME;
    password = process.env.BCEID_PASSWORD;
    usedLocalEnvFallback = !!(username && password);
  }

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password required'
    });
  }

  try {
    if (!process.env.VERCEL && !usedLocalEnvFallback) {
      // Local dev: if creds match .env, skip live validation
      const envUser = process.env.BCEID_USERNAME;
      const envPass = process.env.BCEID_PASSWORD;
      if (envUser && envPass && username === envUser && password === envPass) {
        log('[LOGIN] Local: Credentials match .env, skipping live validation');
      } else {
        log('[LOGIN] Local: Validating credentials with BC Self-Serve...');
        const result = await attemptBCLogin(username, password);
        if (!result.success) {
          const status = isServiceUnavailableError(result.error) ? 503 : 401;
          log('[LOGIN] BC login validation failed:', result.error);
          return res.status(status).json({
            success: false,
            error: result.error || 'Unable to sign in. Please try again.'
          });
        }
      }
    } else if (!process.env.VERCEL && usedLocalEnvFallback) {
      log('[LOGIN] Local: Using .env credentials fallback (no live validation)');
    } else {
      log('[LOGIN] Vercel: Validating credentials with BC Self-Serve...');
      const result = await attemptBCLogin(username, password);
      if (!result.success) {
        const status = isServiceUnavailableError(result.error) ? 503 : 401;
        log('[LOGIN] Vercel: BC login validation failed:', result.error);
        return res.status(status).json({
          success: false,
          error: result.error || 'Unable to sign in. Please try again.'
        });
      }
    }

    // Store encrypted credentials in session
    req.session.authenticated = true;
    req.session.bceidUsername = username;
    req.session.bceidPassword = encrypt(password);
    const userId = deriveUserId(username);
    req.session.userId = userId;
    req.session.lastActivity = Date.now();
    req.session.uaHash = getUaHash(req);

    // If "Remember Me" checked, extend session to 30 days
    if (rememberMe) {
      req.session.cookie.maxAge = REMEMBER_ME_MAX_AGE_MS;
      log('[LOGIN] Remember Me enabled - session extended to 30 days');
    } else {
      req.session.cookie.maxAge = DEFAULT_SESSION_MAX_AGE_MS;
    }

    req.session.save((saveError) => {
      if (saveError) {
        console.error('[LOGIN] Session save error:', saveError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create session. Please try again.'
        });
      }
      persistAuthCookie(req, res);
      log('[LOGIN] Login successful');
      res.json({ success: true });
    });
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Login validation failed'
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  clearAllAuthState(req, res, (error) => {
    if (error) {
      console.error('[LOGOUT] Session destroy error:', error);
      return res.status(500).json({ success: false, error: 'Logout failed. Please retry.' });
    }
    res.json({ success: true });
  });
});

// Get current user info
app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    username: req.session.bceidUsername || 'User'
  });
});

app.get('/api/cra/summary', requireAuth, (req, res) => {
  const profile = getCraProfile(req);
  const currentTaxYear = String(new Date().getFullYear() - 1);
  const taxYear = profile?.taxYear || currentTaxYear;

  res.json({
    connected: !!profile,
    profile,
    taxYear,
    dtc: {
      readyToPrepare: true,
      uploadSupported: false,
      note: 'This phase prepares the T2201 draft and CRA task checklist. Final CRA submission still needs CRA My Account or certified tax software.'
    },
    tasks: [
      {
        id: 'slips',
        title: `Collect ${taxYear} tax slips`,
        status: profile ? 'ready' : 'connect',
        detail: 'Use CRA My Account to confirm T4A, T4, T5, RRSP, tuition, and benefit slips.'
      },
      {
        id: 'notices',
        title: 'Review notices and mail',
        status: profile ? 'ready' : 'connect',
        detail: 'Check Notice of Assessment, benefit letters, carry-forward balances, and CRA mail before filing.'
      },
      {
        id: 'dtc',
        title: 'Prepare DTC application',
        status: 'ready',
        detail: 'Generate a T2201 draft, then have a medical practitioner complete Part B before CRA upload.'
      },
      {
        id: 'filing',
        title: `File ${taxYear} return`,
        status: 'manual',
        detail: 'Use CRA My Account plus certified tax software or a tax preparer for final filing.'
      }
    ],
    links: [
      {
        label: 'CRA My Account',
        url: 'https://www.canada.ca/en/revenue-agency/services/e-services/cra-login-services.html'
      },
      {
        label: 'Disability Tax Credit',
        url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/segments/tax-credits-deductions-persons-disabilities/disability-tax-credit.html'
      },
      {
        label: 'Auto-fill My Return',
        url: 'https://www.canada.ca/en/services/taxes/income-tax/personal-income-tax/how-file/tax-software/complete-return/auto-fill.html'
      }
    ],
    artifacts: getCraArtifacts()
  });
});

app.post('/api/cra/connect', requireAuth, (req, res) => {
  const { displayName, signInMethod, taxYear, province } = req.body || {};

  if (displayName && (typeof displayName !== 'string' || displayName.length > 120)) {
    return res.status(400).json({ error: 'Invalid displayName' });
  }
  if (signInMethod && (typeof signInMethod !== 'string' || signInMethod.length > 120)) {
    return res.status(400).json({ error: 'Invalid signInMethod' });
  }
  if (taxYear && !/^\d{4}$/.test(String(taxYear))) {
    return res.status(400).json({ error: 'Invalid taxYear' });
  }
  if (province && (typeof province !== 'string' || province.length > 40)) {
    return res.status(400).json({ error: 'Invalid province' });
  }

  req.session.craProfile = {
    displayName: (displayName || req.session.bceidUsername || 'CRA account').trim(),
    signInMethod: (signInMethod || 'CRA user ID and password').trim(),
    taxYear: String(taxYear || new Date().getFullYear() - 1),
    province: (province || 'BC').trim(),
    lastConnectedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    profile: getCraProfile(req)
  });
});

app.post('/api/cra/disconnect', requireAuth, (req, res) => {
  delete req.session.craProfile;
  res.json({ success: true });
});

// CRA tax filing status -- track which years have been filed
app.get('/api/cra/filing-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const sessionData = req.session.filingStatus;
    if (sessionData) return res.json(sessionData);
    const data = await loadUserBlob(userId, 'filing-status', { filedYears: [] });
    req.session.filingStatus = data;
    res.json(data);
  } catch (err) {
    log('[FILING] GET error:', err.message);
    res.json({ filedYears: [] });
  }
});

app.post('/api/cra/filing-status', requireAuth, async (req, res) => {
  try {
    const { filedYears } = req.body;
    if (!Array.isArray(filedYears) || !filedYears.every(y => /^\d{4}$/.test(String(y)))) {
      return res.status(400).json({ error: 'filedYears must be array of year strings' });
    }
    const userId = req.session?.userId;
    const data = { filedYears, updatedAt: new Date().toISOString() };
    req.session.filingStatus = data;
    await saveUserBlob(userId, 'filing-status', data);
    res.json(data);
  } catch (err) {
    log('[FILING] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save filing status' });
  }
});

app.post('/api/cra/dtc/prepare', requireAuth, async (req, res) => {
  try {
    const { legalName, sin, dob, submit } = req.body || {};

    if (typeof legalName !== 'string' || !legalName.trim()) {
      return res.status(400).json({ error: 'legalName is required' });
    }
    if (typeof sin !== 'string' || !/^\d{9}$/.test(sin.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'sin must be 9 digits' });
    }
    if (typeof dob !== 'string' || !dob.trim()) {
      return res.status(400).json({ error: 'dob is required' });
    }

    const result = await prepareDtcDraft({
      legalName: legalName.trim(),
      sin: sin.replace(/\D/g, ''),
      dob: dob.trim(),
      submit: !!submit
    });

    res.json(result);
  } catch (error) {
    console.error('[API] /api/cra/dtc/prepare error:', error);
    res.status(500).json({
      success: false,
      error: safeApiError(error, 'Failed to prepare DTC draft')
    });
  }
});

let lastCheckResult = null;
let isChecking = false;

// Benefits screener (public, no auth)
app.get('/screen', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/screen.html'));
});

// Public info summary endpoint — reads from Blob cache (auth required)
app.get('/api/info', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    let data = null;

    if (process.env.VERCEL) {
      if (!userId) return res.status(401).json({ error: 'Missing user session' });
      const stored = await loadUserBlob(userId, 'results', null);
      if (stored) data = stored.data || stored;
    }

    // Local: use in-memory or file fallback
    if (!data && lastCheckResult && lastCheckResult.success) {
      data = lastCheckResult;
    }

    if (!data) {
      const dataDir = path.join(__dirname, '../data');
      try {
        const files = fs.readdirSync(dataDir)
          .filter(f => f.startsWith('results-') && f.endsWith('.json'))
          .map(f => ({ name: f, path: path.join(dataDir, f), time: fs.statSync(path.join(dataDir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
        for (const file of files) {
          const d = JSON.parse(fs.readFileSync(file.path, 'utf8'));
          if (!hasErrors(d)) { data = d; break; }
        }
      } catch (_) {}
    }

    if (!data || !data.sections) {
      return res.status(404).json({ error: 'No cached data available. Run a scrape first.' });
    }

    // Extract payment info
    const paymentSection = data.sections['Payment Info'];
    let nextAmount = null;
    let nextDate = null;

    if (paymentSection && paymentSection.tableData) {
      for (const row of paymentSection.tableData) {
        const amtMatch = row.match(/Amount:\s*(\$[\d,]+\.\d{2})/i);
        if (amtMatch) nextAmount = amtMatch[1];
        const dateMatch = row.match(/(\d{4}\s*\/\s*[A-Z]{3}\s*\/\s*\d{2})/);
        if (dateMatch && !nextDate) nextDate = dateMatch[1];
      }
      // Also check allText for date
      if (!nextDate && paymentSection.allText) {
        for (const line of paymentSection.allText) {
          const m = line.match(/(\d{4}\s*\/\s*[A-Z]{3}\s*\/\s*\d{2})/);
          if (m) { nextDate = m[1]; break; }
        }
      }
    }

    // Extract message count
    const messagesSection = data.sections['Messages'];
    const unreadCount = messagesSection && messagesSection.allText
      ? messagesSection.allText.filter(msg => msg.match(/^\d{4}\s*\/\s*[A-Z]{3}\s*\/\s*\d{2}/)).length
      : 0;

    // Extract active benefits from payment section
    const activeBenefits = [];
    if (paymentSection && paymentSection.allText) {
      for (const line of paymentSection.allText) {
        if (line.match(/income assistance/i)) activeBenefits.push('Income Assistance');
        if (line.match(/disability/i)) activeBenefits.push('Disability Assistance');
      }
    }
    if (activeBenefits.length === 0) activeBenefits.push('Income Assistance');

    // Extract monthly reports
    const reportsSection = data.sections['Monthly Reports'];
    let monthlyReports = null;
    if (reportsSection && reportsSection.success) {
      monthlyReports = {
        periods: reportsSection.periods || [],
        statuses: reportsSection.statuses || [],
        reportCount: (reportsSection.reportLinks || []).length,
        hasDetail: !!reportsSection.detailData
      };
    }

    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      nextPayment: {
        amount: nextAmount || 'Unknown',
        date: nextDate || 'Unknown'
      },
      unreadMessages: unreadCount,
      activeBenefits: [...new Set(activeBenefits)],
      monthlyReports,
      lastUpdated: data.timestamp || data.checkedAt || new Date().toISOString()
    });
  } catch (error) {
    console.error('[INFO] Error:', error);
    res.status(500).json({ error: safeApiError(error, 'Failed to load account info') });
  }
});

// Root: auto-login on localhost if .env creds available, otherwise landing/login
app.get('/', async (req, res) => {
  // Already authenticated
  if (req.session && req.session.authenticated) {
    return res.redirect('/app');
  }

  // Local dev: auto-authenticate with .env credentials (skip browser validation)
  if (!process.env.VERCEL) {
    const username = process.env.BCEID_USERNAME;
    const password = process.env.BCEID_PASSWORD;
    if (username && password) {
      req.session.authenticated = true;
      req.session.bceidUsername = username;
      req.session.bceidPassword = encrypt(password);
      req.session.userId = deriveUserId(username);
      req.session.lastActivity = Date.now();
      req.session.uaHash = getUaHash(req);
      req.session.cookie.maxAge = DEFAULT_SESSION_MAX_AGE_MS;
      log('[AUTO-LOGIN] Local dev: authenticated with .env credentials');
      return req.session.save((saveError) => {
        if (saveError) {
          console.error('[AUTO-LOGIN] Session save error:', saveError);
          return res.redirect('/login.html');
        }
        persistAuthCookie(req, res);
        return res.redirect('/app');
      });
    }
  }

  return res.redirect('/login.html');
});

// Serve dashboard (require login)
app.get('/app', async (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect('/login.html');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../web/unified.html'));
});

// Serve static files AFTER route handlers (prevents index.html from bypassing auth)
app.use('/data', requireAuth, express.static(path.join(__dirname, '../data')));
app.use(express.static(path.join(__dirname, '../web'), {
  index: false, // Don't serve index.html as default
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/api', requireAuth, (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});


// Summary endpoint for OpenClaw integration
app.get('/api/summary', async (req, res) => {
  try {
    // Check for API token (header only -- query strings leak in logs/referrers)
    const apiToken = req.headers['x-api-token'];
    const expectedToken = process.env.API_TOKEN;

    if (!expectedToken) {
      return res.status(401).json({ error: 'API token not configured' });
    }

    if (!apiToken || apiToken.length !== expectedToken.length || !crypto.timingSafeEqual(Buffer.from(apiToken), Buffer.from(expectedToken))) {
      return res.status(401).json({ error: 'Invalid API token' });
    }

    // Get latest data (same logic as /api/latest but simplified)
    let data = null;

    // Try Vercel Blob first
    if (process.env.VERCEL) {
      try {
        const { list } = require('@vercel/blob');
        const { blobs } = await list({ prefix: 'chequecheck-cache/results.json' });
        if (blobs && blobs.length > 0) {
          const response = await fetch(blobs[0].url);
          data = await response.json();
        }
      } catch (err) {
        log('[SUMMARY] Blob read failed:', err.message);
      }
    }

    // Fallback to local files
    if (!data) {
      const dataDir = path.join(__dirname, '../data');
      const files = fs.readdirSync(dataDir)
        .filter(f => f.startsWith('results-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(dataDir, f),
          time: fs.statSync(path.join(dataDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 0) {
        data = JSON.parse(fs.readFileSync(files[0].path, 'utf8'));
      }
    }

    if (!data || !data.sections) {
      return res.status(404).json({ error: 'No data available' });
    }

    // Extract payment info
    const paymentSection = data.sections['Payment Info'];
    let totalPayment = null;
    let supportAmount = null;
    let shelterAmount = null;

    if (paymentSection && paymentSection.tableData) {
      const totalRow = paymentSection.tableData.find(row => row.includes('Amount:'));
      if (totalRow) {
        const match = totalRow.match(/\$[\d,]+\.\d{2}/);
        if (match) totalPayment = match[0];
      }

      paymentSection.tableData.forEach(row => {
        if (row.includes('Support')) {
          const match = row.match(/\$[\d,]+\.\d{2}/);
          if (match) supportAmount = match[0];
        }
        if (row.includes('SHELTER')) {
          const match = row.match(/\$[\d,]+\.\d{2}/);
          if (match) shelterAmount = match[0];
        }
      });
    }

    // Extract messages count
    const messagesSection = data.sections.Messages;
    const messageCount = messagesSection && messagesSection.allText
      ? messagesSection.allText.filter(msg =>
          msg.match(/^\d{4} \/ [A-Z]{3} \/ \d{2}/)
        ).length
      : 0;

    // Extract notifications
    const notificationsSection = data.sections.Notifications;
    const hasNotifications = notificationsSection && notificationsSection.allText
      ? notificationsSection.allText.some(n => !n.includes('no notifications'))
      : false;

    // Extract service requests count
    const requestsSection = data.sections['Service Requests'];
    const requestCount = requestsSection && requestsSection.allText
      ? requestsSection.allText.filter(r => r.match(/^\d{4} \/ [A-Z]{3} \/ \d{2}/)).length
      : 0;

    // Build clean response
    const summary = {
      payment: {
        total: totalPayment,
        support: supportAmount,
        shelter: shelterAmount
      },
      counts: {
        messages: messageCount,
        notifications: hasNotifications ? 1 : 0,
        requests: requestCount
      },
      lastUpdated: data.timestamp,
      status: 'ok'
    };

    res.json(summary);
  } catch (error) {
    console.error('[SUMMARY] Error:', error);
    res.status(500).json({ error: safeApiError(error, 'Failed to load summary') });
  }
});


// Helper: get decrypted credentials from session
function getSessionCredentials(req) {
  if (!req.session || !req.session.authenticated) return null;
  const username = req.session.bceidUsername;
  const password = decrypt(req.session.bceidPassword);
  if (!username || !password) return null;
  return { username, password };
}

// Helper: try live HTTP scrape, fall back to Blob cache, fall back to local files
async function fetchOrLoadData(req) {
  const creds = getSessionCredentials(req);
  const userId = req.session?.userId;

  // Check per-user TTL cache
  if (userId && liveCache.has(userId)) {
    const cached = liveCache.get(userId);
    if (Date.now() - cached.ts < LIVE_CACHE_TTL_MS) {
      log('[API] Returning cached live result for user', userId);
      return cached.result;
    }
    liveCache.delete(userId);
  }

  // Try live HTTP scrape (45s timeout)
  if (creds) {
    try {
      log('[API] Attempting live HTTP scrape...');
      const result = await Promise.race([
        fetchAllSectionsWithHybridAuth(creds.username, creds.password),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Live scrape timeout')), 45000))
      ]);
      if (result && result.success) {
        log('[API] Live HTTP scrape succeeded');
        lastCheckResult = { ...result, checkedAt: new Date().toISOString() };
        // Write to Blob in background (fire-and-forget)
        saveUserBlob(userId, 'results', lastCheckResult).catch(() => {});
        const liveResult = { source: 'live', data: result };
        if (userId) {
          liveCache.set(userId, { ts: Date.now(), result: liveResult });
        }
        return liveResult;
      }
      log('[API] Live scrape returned failure:', result?.error);
    } catch (err) {
      log('[API] Live scrape failed:', err.message);
    }
  }

  // Fall back to Blob cache
  const blobData = await loadUserBlob(userId, 'results', null);
  if (blobData) {
    log('[API] Returning data from Vercel Blob');
    return { source: 'vercel-blob', data: blobData };
  }

  // Fall back to in-memory
  if (lastCheckResult && lastCheckResult.success && !hasErrors(lastCheckResult)) {
    return { source: 'in-memory', data: lastCheckResult };
  }

  // Fall back to local files
  const dataDir = path.join(__dirname, '../data');
  try {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('results-') && f.endsWith('.json'))
      .map(f => ({ name: f, path: path.join(dataDir, f), time: fs.statSync(path.join(dataDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
        if (!hasErrors(data)) return { source: file.name, data };
      } catch { /* skip bad file */ }
    }
  } catch { /* no data dir */ }

  return null;
}

app.get('/api/latest', requireAuth, async (req, res) => {
  try {
    log('[API] /api/latest called');
    const uiConfig = { pwdApproved: PWD_APPROVED };

    const result = await fetchOrLoadData(req);
    if (result) {
      return res.json({ file: result.source, data: result.data, uiConfig });
    }

    res.status(404).json({ cached: false, message: 'No data available. Login and try again.' });
  } catch (error) {
    console.error('[API] /api/latest error:', error);
    res.status(500).json({ error: safeApiError(error, 'Failed to load latest data') });
  }
});

// Helper to check if scraped data has errors
function hasErrors(data) {
  if (!data || !data.sections) return true;
  const sections = Object.values(data.sections);
  return sections.some(section => section && section.error);
}

const LEGAL_CATEGORY_CONFIG = [
  {
    name: 'housing',
    description: 'Issues with tenancy, landlords, rent, or eviction process.',
    keywords: ['rent', 'landlord', 'eviction', 'tenant'],
    nextSteps: [
      'Contact the Residential Tenancy Branch (RTB) to confirm dispute deadlines.',
      'Gather notices, payment receipts, and written communication with your landlord.'
    ],
    resources: [
      {
        name: 'Residential Tenancy Branch (RTB)',
        url: 'https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies',
        description: 'BC tenancy rules, dispute process, and timelines.'
      }
    ]
  },
  {
    name: 'employment',
    description: 'Problems related to work conditions, wages, hours, or termination.',
    keywords: ['job', 'fired', 'wages', 'hours'],
    nextSteps: [
      'Write down dates, hours worked, and communication from your employer.',
      'Review BC employment standards for pay, overtime, and termination rules.'
    ],
    resources: [
      {
        name: 'BC Employment Standards',
        url: 'https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards',
        description: 'Official BC employment standards guidance and complaint info.'
      }
    ]
  },
  {
    name: 'disability',
    description: 'Disability supports, accommodations, PWD status, or tax-credit issues.',
    keywords: ['pwd', 'disability', 'accommodation', 'dtc'],
    nextSteps: [
      'Request written reasons for any denial or delay in disability supports.',
      'Prepare medical documentation that describes functional impact.'
    ],
    resources: [
      {
        name: 'BC Disability Assistance (PWD)',
        url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/income-assistance/on-assistance/disability-assistance',
        description: 'PWD eligibility and application details.'
      },
      {
        name: 'CRA Disability Tax Credit (DTC)',
        url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/segments/tax-credits-deductions-persons-disabilities/disability-tax-credit.html',
        description: 'Federal DTC criteria and application process.'
      }
    ]
  },
  {
    name: 'benefits',
    description: 'Income assistance, welfare, EI, or benefit payment decisions.',
    keywords: ['ia', 'income assistance', 'welfare', 'ei'],
    nextSteps: [
      'Request an internal review with your worker as soon as possible.',
      'Keep copies of letters, payment history, and report submissions.'
    ],
    resources: [
      {
        name: 'BC Income Assistance',
        url: 'https://www2.gov.bc.ca/gov/content/family-social-supports/income-assistance',
        description: 'BC income and disability assistance program information.'
      }
    ]
  },
  {
    name: 'family',
    description: 'Family law issues including custody, child support, and separation.',
    keywords: ['custody', 'child', 'support', 'divorce'],
    nextSteps: [
      'Document current parenting and support arrangements in writing.',
      'Check family dispute resolution or legal aid options before court.'
    ],
    resources: [
      {
        name: 'BC Family Law',
        url: 'https://www2.gov.bc.ca/gov/content/life-events/divorce/family-justice',
        description: 'Family justice services and family law guidance in BC.'
      }
    ]
  }
];

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countKeywordHits(text, keyword) {
  if (!keyword) return 0;
  const escaped = escapeRegex(keyword.toLowerCase());
  const pattern = keyword.includes(' ')
    ? new RegExp(escaped, 'g')
    : new RegExp(`\\b${escaped}\\b`, 'g');
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function analyzeLegalDescription(description) {
  const normalized = String(description || '').toLowerCase();
  const matched = [];

  for (const category of LEGAL_CATEGORY_CONFIG) {
    let hitCount = 0;
    for (const keyword of category.keywords) {
      hitCount += countKeywordHits(normalized, keyword);
    }
    if (hitCount > 0) {
      matched.push({ ...category, hitCount });
    }
  }

  matched.sort((a, b) => b.hitCount - a.hitCount);

  const categories = matched.map((category) => ({
    name: category.name.charAt(0).toUpperCase() + category.name.slice(1),
    confidence: Number(Math.min(0.99, 0.35 + (category.hitCount * 0.15)).toFixed(2)),
    description: category.description
  }));

  const nextSteps = [];
  const stepSet = new Set();
  matched.forEach((category) => {
    category.nextSteps.forEach((step) => {
      if (!stepSet.has(step)) {
        stepSet.add(step);
        nextSteps.push(step);
      }
    });
  });

  if (nextSteps.length === 0) {
    nextSteps.push('Write a timeline of what happened and save all related documents.');
    nextSteps.push('Contact BC Legal Aid or a legal advocate for issue-specific guidance.');
  }

  const resources = [];
  const resourceUrls = new Set();
  matched.forEach((category) => {
    category.resources.forEach((resource) => {
      if (!resourceUrls.has(resource.url)) {
        resourceUrls.add(resource.url);
        resources.push(resource);
      }
    });
  });

  if (resources.length === 0) {
    resources.push({
      name: 'BC Legal Aid',
      url: 'https://lss.bc.ca',
      description: 'Legal information and help finding legal services in BC.'
    });
    resources.push({
      name: 'BC Ombudsperson',
      url: 'https://bcombudsperson.ca',
      description: 'Oversight and complaint process for public service decisions.'
    });
  }

  return { categories, nextSteps, resources };
}

app.get('/api/status', requireAuth, (req, res) => {
  if (!lastCheckResult) {
    return res.json({
      checked: false,
      message: 'No checks performed yet. Use /check to run a check.'
    });
  }

  res.json(lastCheckResult);
});

// DTC Eligibility Screener endpoint
app.post('/api/dtc/screen', (req, res) => {
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid answers' });
  }

  try {
    const results = calculateDTCEligibility(answers);
    res.json(results);
  } catch (err) {
    console.error('[API] DTC screening error:', err);
    res.status(500).json({ error: 'Failed to calculate eligibility' });
  }
});

app.post('/api/legal', requireAuth, (req, res) => {
  const { description } = req.body || {};
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (description.length > 5000) {
    return res.status(400).json({ error: 'description too long (max 5000 chars)' });
  }

  try {
    const analysis = analyzeLegalDescription(description);
    res.json(analysis);
  } catch (error) {
    console.error('[API] /api/legal error:', error);
    res.status(500).json({ error: 'Failed to analyze legal issue' });
  }
});

function calculateDTCEligibility(answers) {
  let dtcScore = 0;
  let pwdScore = 0;
  let flags = [];
  let programs = [];

  // Q1: Has diagnosis
  if (answers.q1 === 'yes') { dtcScore += 20; pwdScore += 20; }
  else { flags.push({ type: 'warning', text: 'A formal diagnosis is typically required.' }); }

  // Q2: Condition type
  const conditions = answers.q2 || [];
  if (conditions.includes('autism')) {
    dtcScore += 15; pwdScore += 15;
    flags.push({ type: 'info', text: 'Autism is commonly approved for DTC under "Mental Functions." Late diagnosis does not affect eligibility.' });
  }
  if (conditions.includes('adhd')) { dtcScore += 10; }
  if (conditions.includes('physical') || conditions.includes('vision') || conditions.includes('hearing')) { dtcScore += 15; pwdScore += 15; }

  // Q3: Duration
  if (answers.q3 === 'yes') { dtcScore += 15; pwdScore += 15; }
  else { dtcScore -= 30; pwdScore -= 30; flags.push({ type: 'warning', text: 'DTC requires impairment lasting at least 12 continuous months.' }); }

  // Q4: Province
  if (answers.q4 === 'BC') {
    pwdScore += 10;
    programs.push({ name: 'BC PWD Designation', description: 'Higher monthly assistance ($1,358.50/mo), extended health benefits, bus pass.', eligible: pwdScore > 30 });
  }

  // Q5: Daily activity impact
  if (answers.q5 === 'yes') { dtcScore += 15; pwdScore += 15; }
  else { dtcScore -= 20; }

  // Q6: Specific activities
  const activities = answers.q6 || [];
  if (activities.length >= 4) { dtcScore += 15; pwdScore += 10; }
  else if (activities.length >= 2) { dtcScore += 10; pwdScore += 5; }

  // Q7: Time taken
  if (answers.q7 === 'always') dtcScore += 15;
  else if (answers.q7 === 'usually') dtcScore += 10;
  else if (answers.q7 === 'sometimes') dtcScore += 5;

  // Q8: Need for help
  if (answers.q8 === 'always') { dtcScore += 15; pwdScore += 10; }
  else if (answers.q8 === 'frequently') { dtcScore += 10; pwdScore += 5; }
  else if (answers.q8 === 'occasionally') dtcScore += 5;

  // Q11: Diagnosis timing → retroactive years
  let retroYears = 0;
  const timingMap = { childhood: 10, '10+': 10, '5-10': 7, '3-5': 4, '1-3': 2, recent: 1 };
  retroYears = timingMap[answers.q11] || 0;

  // Calculate refund estimate
  let minRefund = 0, maxRefund = 0;
  dtcScore = Math.max(0, Math.min(100, dtcScore));
  pwdScore = Math.max(0, Math.min(100, pwdScore));

  if (dtcScore > 50 && answers.q10 === 'yes') {
    minRefund = Math.min(retroYears, 10) * 1500;
    maxRefund = Math.min(retroYears, 10) * 2500;
    if (answers.q11 === 'childhood' || answers.q11 === '10+') maxRefund = 25000;
  }

  // DTC program
  programs.unshift({
    name: 'Disability Tax Credit (T2201)',
    description: 'Federal non-refundable tax credit. Can claim retroactively up to 10 years.',
    eligible: dtcScore > 50
  });

  // RDSP
  const existing = answers.q12 || [];
  if (!existing.includes('rdsp') && dtcScore > 50) {
    programs.push({ name: 'RDSP', description: 'Government matches savings up to $3,500/year. Requires DTC approval.', eligible: true });
  }

  const dtcEligibility = dtcScore >= 70 ? 'Likely' : dtcScore >= 50 ? 'Possible' : dtcScore >= 30 ? 'Unlikely' : 'No';
  const pwdEligibility = answers.q4 === 'BC' ? (pwdScore >= 60 ? 'Likely' : pwdScore >= 40 ? 'Possible' : 'Unlikely') : 'N/A (BC only)';

  // Next steps
  const nextSteps = [];
  if (answers.q11 === 'not_yet') nextSteps.push({ priority: 1, title: 'Get a Formal Diagnosis', description: 'Book an assessment with a psychologist or psychiatrist.', action: 'Search for diagnostic assessments in your area' });
  if (dtcScore > 40 && !existing.includes('dtc')) nextSteps.push({ priority: 2, title: 'Apply for the DTC', description: 'Download Form T2201 from CRA. Have your doctor complete Part B.', action: 'Download T2201 form' });
  if (answers.q4 === 'BC' && pwdScore > 30 && !existing.includes('pwd')) nextSteps.push({ priority: 3, title: 'Apply for BC PWD', description: 'Contact your Employment and Assistance Worker.', action: 'Call 1-866-866-0800' });
  if (answers.q9 === 'no') nextSteps.push({ priority: 1, title: 'File Your Tax Returns', description: 'File returns for past years to receive DTC refunds.', action: 'File through CRA My Account' });
  nextSteps.push({ priority: 5, title: 'Document Daily Limitations', description: 'Write specific examples of how your condition affects daily activities.', action: 'Start a daily impact journal' });
  nextSteps.sort((a, b) => a.priority - b.priority);

  return {
    dtc: { score: dtcScore, eligibility: dtcEligibility, estimatedRefund: { min: minRefund, max: maxRefund }, retroYears },
    pwd: { score: pwdScore, eligibility: pwdEligibility, monthlyIncrease: answers.q4 === 'BC' ? '$423.50/mo' : 'N/A' },
    programs, flags, nextSteps
  };
}

// Derive an unguessable blob path prefix from userId + server secret
// Prevents enumeration even though blobs are stored with public access
const blobPrefixCache = new Map();
function blobPrefix(userId) {
  let cached = blobPrefixCache.get(userId);
  if (cached) return cached;
  const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(userId).digest('hex').slice(0, 12);
  cached = `tally-cache/${hmac}-${userId}`;
  blobPrefixCache.set(userId, cached);
  return cached;
}

// Generic per-user Blob persistence
async function loadUserBlob(userId, key, fallback) {
  if (!IS_PRODUCTION || !userId) return fallback;
  try {
    const { list } = require('@vercel/blob');
    const blobPath = `${blobPrefix(userId)}/${key}.json`;
    const { blobs } = await list({ prefix: blobPath });
    const match = blobs?.find(b => b.pathname === blobPath);
    if (match) {
      const resp = await fetch(match.url);
      return await resp.json();
    }
    // Migration: try legacy path without HMAC prefix (remove after 2026-05-01)
    const legacyPath = `tally-cache/${userId}/${key}.json`;
    const { blobs: legacyBlobs } = await list({ prefix: legacyPath });
    const legacyMatch = legacyBlobs?.find(b => b.pathname === legacyPath);
    if (legacyMatch) {
      const resp = await fetch(legacyMatch.url);
      const data = await resp.json();
      // Re-save under new HMAC path
      await saveUserBlob(userId, key, data);
      // Delete legacy blob
      try {
        const { del } = require('@vercel/blob');
        await del(legacyMatch.url);
        log(`[BLOB] Migrated ${key} from legacy path`);
      } catch { /* non-fatal */ }
      return data;
    }
  } catch (err) {
    log(`[BLOB] Read ${key} failed:`, err.message);
  }
  return fallback;
}

async function saveUserBlob(userId, key, data) {
  if (!IS_PRODUCTION || !userId) return;
  try {
    const { put } = require('@vercel/blob');
    await put(`${blobPrefix(userId)}/${key}.json`, JSON.stringify(data), { access: 'public', addRandomSuffix: false });
  } catch (err) {
    log(`[BLOB] Write ${key} failed:`, err.message);
  }
}

// Paid status -- persistent per-month history, stored in Blob
app.get('/api/paid-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const cached = req.session.paidStatus;
    if (cached && cached.paidMonths) {
      return res.json(cached);
    }
    const defaultData = { paidMonths: {} };
    const stored = await loadUserBlob(userId, 'paid-status', defaultData);
    // Migrate old format: {paid, month, updatedAt} -> {paidMonths: {}}
    if (!stored.paidMonths && stored.month) {
      const migrated = { paidMonths: {} };
      if (stored.paid && stored.updatedAt) {
        migrated.paidMonths[stored.month] = stored.updatedAt;
      }
      req.session.paidStatus = migrated;
      await saveUserBlob(userId, 'paid-status', migrated);
      return res.json(migrated);
    }
    const data = stored.paidMonths ? stored : defaultData;
    req.session.paidStatus = data;
    res.json(data);
  } catch (err) {
    log('[PAID] GET error:', err.message);
    res.json({ paidMonths: {} });
  }
});

app.post('/api/paid-status', requireAuth, async (req, res) => {
  try {
    const { month, paid } = req.body;
    if (typeof paid !== 'boolean' || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'paid must be boolean, month must be YYYY-MM' });
    }
    const userId = req.session?.userId;
    const existing = req.session.paidStatus?.paidMonths ? req.session.paidStatus : await loadUserBlob(userId, 'paid-status', { paidMonths: {} });
    const data = { paidMonths: { ...(existing.paidMonths || {}) } };
    if (paid) {
      data.paidMonths[month] = new Date().toISOString();
    } else {
      delete data.paidMonths[month];
    }
    req.session.paidStatus = data;
    await saveUserBlob(userId, 'paid-status', data);
    persistAuthCookie(req, res);
    res.json(data);
  } catch (err) {
    log('[PAID] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save paid status' });
  }
});

// Report filed status -- track which months the user has filed their report
app.get('/api/report-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const cached = req.session.reportStatus;
    if (cached && cached.reportMonths) {
      return res.json(cached);
    }
    const defaultData = { reportMonths: {} };
    const stored = await loadUserBlob(userId, 'report-status', defaultData);
    const data = stored.reportMonths ? stored : defaultData;
    req.session.reportStatus = data;
    res.json(data);
  } catch (err) {
    log('[REPORT] GET error:', err.message);
    res.json({ reportMonths: {} });
  }
});

app.post('/api/report-status', requireAuth, async (req, res) => {
  try {
    const { month, filed } = req.body;
    if (typeof filed !== 'boolean' || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'filed must be boolean, month must be YYYY-MM' });
    }
    const userId = req.session?.userId;
    const existing = req.session.reportStatus?.reportMonths ? req.session.reportStatus : await loadUserBlob(userId, 'report-status', { reportMonths: {} });
    const data = { reportMonths: { ...(existing.reportMonths || {}) } };
    if (filed) {
      data.reportMonths[month] = new Date().toISOString();
    } else {
      delete data.reportMonths[month];
    }
    req.session.reportStatus = data;
    await saveUserBlob(userId, 'report-status', data);
    persistAuthCookie(req, res);
    res.json(data);
  } catch (err) {
    log('[REPORT] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save report status' });
  }
});

// Read messages -- track which message IDs user has seen, persisted to Blob
app.get('/api/read-messages', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const sessionData = req.session.readMessages;
    if (sessionData) return res.json(sessionData);
    const data = await loadUserBlob(userId, 'read-messages', { readIds: [] });
    req.session.readMessages = data;
    res.json(data);
  } catch (err) {
    log('[MESSAGES] GET error:', err.message);
    res.json({ readIds: [] });
  }
});

app.post('/api/read-messages', requireAuth, async (req, res) => {
  try {
    const { readIds } = req.body;
    if (!Array.isArray(readIds)) {
      return res.status(400).json({ error: 'readIds must be an array' });
    }
    const userId = req.session?.userId;
    const data = { readIds, updatedAt: new Date().toISOString() };
    req.session.readMessages = data;
    await saveUserBlob(userId, 'read-messages', data);
    res.json(data);
  } catch (err) {
    log('[MESSAGES] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save read messages' });
  }
});

// Dev-only: serve .env submission credentials for auto-fill
app.get('/api/submit-creds', requireAuth, (req, res) => {
  res.json({});
});

// Submit monthly report
let isSubmitting = false;
app.post('/api/submit-report', scrapeLimiter, requireAuth, async (req, res) => {
  if (isSubmitting) {
    return res.status(429).json({ error: 'Submission already in progress' });
  }
  isSubmitting = true;

  try {
    const { sin, phone, pin, dryRun } = req.body || {};

    // Resolve values: body > .env fallback
    const resolvedSin = sin || process.env.BC_SIN;
    const resolvedPhone = phone || process.env.BC_PHONE;
    const resolvedPin = pin || process.env.BC_PIN;

    if (!resolvedSin || !resolvedPhone || !resolvedPin) {
      isSubmitting = false;
      return res.status(400).json({ error: 'SIN, phone, and PIN are required' });
    }

    // Get login credentials from session
    let username, password;
    if (req.session && req.session.authenticated) {
      username = req.session.bceidUsername;
      password = decrypt(req.session.bceidPassword);
    } else if (!process.env.VERCEL) {
      username = process.env.BCEID_USERNAME;
      password = process.env.BCEID_PASSWORD;
    }

    if (!username || !password) {
      isSubmitting = false;
      return res.status(401).json({ error: 'No login credentials available' });
    }

    const result = await runSubmitMonthlyReport({
      username,
      password,
      sin: resolvedSin,
      phone: resolvedPhone,
      pin: resolvedPin,
      dryRun: !!dryRun,
      headless: true
    });

    isSubmitting = false;
    res.json(result);
  } catch (error) {
    isSubmitting = false;
    console.error('[API] submit-report error:', error);
    res.status(500).json({ success: false, error: safeApiError(error, 'Failed to submit report') });
  }
});

app.get('/api/check', scrapeLimiter, requireAuth, async (req, res) => {
  if (isChecking) {
    return res.status(429).json({
      error: 'Check already in progress',
      message: 'Please wait for the current check to complete'
    });
  }

  isChecking = true;

  try {
    log('[API] Starting check for all sections...');

    let username;
    let password;

    if (process.env.VERCEL) {
      // Production: only use credentials supplied at login and stored in session.
      if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ error: 'Not authenticated. Please login first.' });
      }
      username = req.session.bceidUsername;
      password = decrypt(req.session.bceidPassword);
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing login credentials in session. Please login again.' });
      }
    } else if (req.session && req.session.authenticated) {
      // Local: authenticated session takes priority.
      username = req.session.bceidUsername;
      password = decrypt(req.session.bceidPassword);
    } else {
      // Local-only fallback for quick testing.
      username = process.env.BCEID_USERNAME;
      password = process.env.BCEID_PASSWORD;
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing local .env credentials' });
      }
    }

    const result = await fetchAllSectionsWithHybridAuth(username, password);

    lastCheckResult = {
      ...result,
      checkedAt: new Date().toISOString()
    };

    if (!result || !result.success) {
      isChecking = false;
      const scrapeError = (result && result.error) ? result.error : 'Scrape failed';
      console.error('[API] Scrape failed:', scrapeError);
      return res.status(502).json({
        success: false,
        error: scrapeError,
        data: lastCheckResult
      });
    }

    if (process.env.VERCEL && req.session?.userId && result && result.success) {
      try {
        await saveUserBlob(req.session.userId, 'results', lastCheckResult);
        log('[API] Saved scrape result to Blob');
      } catch (blobWriteError) {
        console.error('[API] Failed to write scrape result to Blob:', blobWriteError.message);
      }
    }

    isChecking = false;

    res.json({
      success: true,
      data: lastCheckResult
    });
  } catch (error) {
    isChecking = false;

    const errorResult = {
      success: false,
      error: safeApiError(error, 'Failed to check BC Self-Serve'),
      checkedAt: new Date().toISOString()
    };

    lastCheckResult = errorResult;

    res.status(500).json(errorResult);
  }
});

// ── Mobile API ──────────────────────────────────────────────────────────────

function extractMobileData(scraperResult) {
  const sections = scraperResult?.sections || {};

  // Extract payment amount from Payment Info tableData
  const paymentSection = sections['Payment Info'] || {};
  const paymentData = (paymentSection.tableData || []).filter(s => typeof s === 'string');
  const paymentAllText = (paymentSection.allText || []).filter(s => typeof s === 'string');
  const raw = [...paymentData, ...paymentAllText].join('\n');
  const amountMatch = raw.match(/Amount:\s*(\$[\d,]+(?:\.\d{2})?)/);
  const paymentAmount = amountMatch ? amountMatch[1] : null;

  // Fallback: if regex fails, provide designation-aware default
  const designationMatch = raw.match(/Persons?\s+with\s+Disabilities|PWD/i);
  const fallbackAmount = designationMatch ? '~$1,500-1,700/mo' : '~$1,000/mo';

  // Compute next payment date
  const payDates2026 = {
    0: 21, 1: 25, 2: 25, 3: 23, 4: 27, 5: 25,
    6: 23, 7: 26, 8: 24, 9: 28, 10: 25, 11: 16
  };
  const now = new Date();
  const thisMonthDay = payDates2026[now.getMonth()];
  let nextPayday;
  if (thisMonthDay && now <= new Date(now.getFullYear(), now.getMonth(), thisMonthDay)) {
    nextPayday = new Date(now.getFullYear(), now.getMonth(), thisMonthDay);
  } else {
    const nextMonth = (now.getMonth() + 1) % 12;
    const nextDay = payDates2026[nextMonth] || 25;
    const nextYear = nextMonth === 0 ? now.getFullYear() + 1 : now.getFullYear();
    nextPayday = new Date(nextYear, nextMonth, nextDay);
  }
  const pad = (n) => String(n).padStart(2, '0');
  const nextDate = `${nextPayday.getFullYear()}-${pad(nextPayday.getMonth() + 1)}-${pad(nextPayday.getDate())}`;

  // Extract messages from Messages section
  const MONTHS = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const messagesAllText = (sections.Messages && sections.Messages.allText) || [];
  const messages = messagesAllText
    .filter((entry) => typeof entry === 'string' && entry.includes('\n'))
    .map((entry, idx) => {
      const newlineIdx = entry.indexOf('\n');
      const rawDate = entry.substring(0, newlineIdx).trim();
      const text = entry.substring(newlineIdx + 1).trim();
      // Parse "YYYY / MON / DD" -> ISO date
      const dateParts = rawDate.replace(/\s*\/\s*/g, '-').replace(/(\d{4})-([A-Z]{3})-(\d{2})/, (_, y, m, d) => {
        return `${y}-${MONTHS[m] || '01'}-${d}`;
      });
      return { id: `msg-${idx}`, text, timestamp: dateParts };
    });

  return { payment_amount: paymentAmount || fallbackAmount, next_date: nextDate, messages };
}


app.get('/api/mobile', requireAuth, async (req, res) => {
  try {
    const result = await fetchOrLoadData(req);
    if (!result || !result.data || !result.data.sections) {
      return res.status(404).json({ error: 'No data available' });
    }
    res.json(extractMobileData(result.data));
  } catch (error) {
    console.error('[API] /api/mobile error:', error);
    res.status(500).json({ error: safeApiError(error, 'Failed to load data') });
  }
});


// 404 handler — must be last
app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 — Tally</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0c1220; color: #e8e4da; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .wrap { text-align: center; }
    h1 { font-size: 5rem; color: #4e9cd7; font-weight: 700; letter-spacing: -0.04em; }
    p { color: #8a9e90; margin: 1rem 0 2rem; font-size: 1rem; }
    a { display: inline-block; padding: 0.6rem 1.6rem; background: #1a5a96; color: #e8e4da; text-decoration: none; border-radius: 100px; font-size: 0.9rem; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s; }
    a:hover { background: #2472b2; transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>404</h1>
    <p>Page not found.</p>
    <a href="/">Go home</a>
  </div>
</body>
</html>`);
});

// Vercel: export the Express app as a serverless function
// Local: start the server
const isServerlessRuntime = !!process.env.LAMBDA_TASK_ROOT;
if (isServerlessRuntime) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    log(`[API] Server running on http://localhost:${PORT}`);
    log(`[API] Endpoints:`);
    log(`  GET /                - Dashboard`);
    log(`  POST /api/login      - Login`);
    log(`  GET /api/check       - Run scraper`);
    log(`  GET /api/latest      - Get latest data`);
    log(`  GET /api/status      - Get scrape status`);
    log(`  GET /api/health      - Health check`);
    log(`[API] Dashboard will load data from latest good file`);
  });
}
