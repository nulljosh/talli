const assert = require('assert');
const cheerio = require('cheerio');

// Copies of pure helpers from src/http-scraper.js for isolated testing.

const KEYWORD_REGEX = /(.{0,150}(payment|paid|pending|processed|deposit|amount|balance|invoice|status|notification|message).{0,150})/gi;

function createCookieJar() {
  return { _domains: {} };
}

function resolveUrl(url, base) {
  return new URL(url, base).toString();
}

function splitCombinedSetCookie(headerValue) {
  if (!headerValue) return [];

  const cookies = [];
  let start = 0;
  let inExpires = false;

  for (let i = 0; i < headerValue.length; i += 1) {
    const char = headerValue[i];
    const slice = headerValue.slice(i, i + 8).toLowerCase();

    if (slice === 'expires=') {
      inExpires = true;
    } else if (inExpires && char === ';') {
      inExpires = false;
    } else if (!inExpires && char === ',') {
      const nextChunk = headerValue.slice(i + 1);
      if (/^\s*[^=;,]+\s*=/.test(nextChunk)) {
        cookies.push(headerValue.slice(start, i).trim());
        start = i + 1;
      }
    }
  }

  const finalCookie = headerValue.slice(start).trim();
  if (finalCookie) cookies.push(finalCookie);
  return cookies;
}

function storeCookies(jar, setCookieHeaders, requestUrl) {
  for (const header of setCookieHeaders) {
    if (!header) continue;
    const firstPart = header.split(';', 1)[0];
    const separatorIndex = firstPart.indexOf('=');
    if (separatorIndex <= 0) continue;
    const name = firstPart.slice(0, separatorIndex).trim();
    const value = firstPart.slice(separatorIndex + 1).trim();
    if (!name) continue;

    let domain = '';
    const domainMatch = header.match(/;\s*domain=\.?([^;\s]+)/i);
    if (domainMatch) {
      domain = domainMatch[1].toLowerCase();
    } else if (requestUrl) {
      try { domain = new URL(requestUrl).hostname; } catch {}
    }

    if (domain) {
      if (!jar._domains[domain]) jar._domains[domain] = {};
      jar._domains[domain][name] = value;
    }

    jar[name] = value;
  }
}

function getCookieHeader(jar, requestUrl) {
  if (!requestUrl || !jar._domains) {
    return Object.entries(jar)
      .filter(([name]) => name !== '_domains')
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  let hostname;
  try { hostname = new URL(requestUrl).hostname; } catch {
    return Object.entries(jar)
      .filter(([name]) => name !== '_domains')
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  const matched = Object.fromEntries(
    Object.entries(jar).filter(([name]) => name !== '_domains')
  );

  for (const [domain, cookies] of Object.entries(jar._domains)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      Object.assign(matched, cookies);
    }
  }

  return Object.entries(matched)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function parseSignInLink(html, pageUrl) {
  const $ = cheerio.load(html);
  let href = null;

  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const candidate = $(el).attr('href');
    if (!href && candidate && (text.includes('sign in') || text.includes('log in'))) {
      href = resolveUrl(candidate, pageUrl);
    }
  });

  return href;
}

function parseLoginForm(html, pageUrl) {
  const $ = cheerio.load(html);
  let form = null;

  $('form').each((_, el) => {
    const hasUser = $(el).find('input[name="user"], input[id="user"], input[name*="user"], input[name*="User"]').length > 0;
    const hasPassword = $(el).find('input[name="password"], input[id="password"], input[type="password"]').length > 0;
    if (!form && (hasUser || hasPassword)) {
      form = el;
    }
  });

  if (!form) {
    form = $('form').first().get(0);
  }

  if (!form) {
    throw new Error('Login form not found');
  }

  const $form = $(form);
  const action = resolveUrl($form.attr('action') || pageUrl, pageUrl);
  const hiddenFields = {};

  $form.find('input').each((_, input) => {
    const $input = $(input);
    const name = $input.attr('name');
    const type = ($input.attr('type') || 'text').toLowerCase();
    if (!name) return;
    if (type === 'hidden') {
      hiddenFields[name] = $input.attr('value') || '';
    }
  });

  const usernameField =
    $form.find('input[name="user"], input[id="user"], input[name*="user"], input[name*="User"]').first().attr('name') || 'user';
  const passwordField =
    $form.find('input[name="password"], input[id="password"], input[type="password"]').first().attr('name') || 'password';

  return {
    action,
    hiddenFields,
    usernameField,
    passwordField
  };
}

function uniqueTrimmed(values) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function extractSectionData(html, url) {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const allText = [];
  const tableData = [];
  const keywords = [];

  $('li').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 10 && !text.toLowerCase().includes('menu')) {
      allText.push(text);
    }
  });

  $('p, div.content, div.message, div.notification').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 20) {
      allText.push(text);
    }
  });

  $('table tr').each((_, row) => {
    const cells = [];
    $(row)
      .find('td, th')
      .each((__, cell) => {
        const text = $(cell).text().replace(/\s+/g, ' ').trim();
        if (text) cells.push(text);
      });
    if (cells.length > 0) {
      tableData.push(cells.join(' | '));
    }
  });

  const matches = bodyText.match(KEYWORD_REGEX) || [];
  keywords.push(...matches.map(match => match.trim()));

  return {
    allText: uniqueTrimmed(allText),
    tableData: uniqueTrimmed(tableData),
    keywords: uniqueTrimmed(keywords),
    pageTitle: $('title').first().text().trim(),
    url,
    bodyLength: bodyText.length
  };
}

function run() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [OK] ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`  [FAIL] ${name}: ${error.message}`);
      failed += 1;
    }
  }

  console.log('HTTP Scraper Tests\n');

  test('extractSectionData collects li text longer than 10 chars and excludes menu', () => {
    const html = `
      <html>
        <head><title>List Page</title></head>
        <body>
          <ul>
            <li>Short</li>
            <li>Main menu options here</li>
            <li>This is a long list item worth keeping</li>
            <li>Another retained entry for the page</li>
          </ul>
        </body>
      </html>
    `;
    const result = extractSectionData(html, 'https://example.com/list');

    assert.deepStrictEqual(result.allText, [
      'This is a long list item worth keeping',
      'Another retained entry for the page'
    ]);
    assert.deepStrictEqual(result.tableData, []);
    assert.ok(Array.isArray(result.keywords));
    assert.strictEqual(result.pageTitle, 'List Page');
    assert.strictEqual(result.url, 'https://example.com/list');
    assert.ok(result.bodyLength > 0);
  });

  test('extractSectionData collects p and div.content text longer than 20 chars', () => {
    const html = `
      <html>
        <head><title>Content Page</title></head>
        <body>
          <p>Too short.</p>
          <p>This paragraph should definitely be captured by the parser.</p>
          <div class="content">This content block also has enough text to be retained.</div>
          <div class="content">Small content</div>
        </body>
      </html>
    `;
    const result = extractSectionData(html, 'https://example.com/content');

    assert.deepStrictEqual(result.allText, [
      'This paragraph should definitely be captured by the parser.',
      'This content block also has enough text to be retained.'
    ]);
  });

  test('extractSectionData converts table rows into pipe-joined tableData', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr><th>Name</th><th>Status</th></tr>
            <tr><td>March</td><td>Processed</td></tr>
            <tr><td>April</td><td>Pending</td></tr>
          </table>
        </body>
      </html>
    `;
    const result = extractSectionData(html, 'https://example.com/table');

    assert.deepStrictEqual(result.tableData, [
      'Name | Status',
      'March | Processed',
      'April | Pending'
    ]);
  });

  test('extractSectionData captures keyword matches from body text', () => {
    const html = `
      <html>
        <body>
          <p>Your payment status is pending and the deposit amount will update tomorrow.</p>
          <div class="notification">A notification message was posted to your account.</div>
        </body>
      </html>
    `;
    const result = extractSectionData(html, 'https://example.com/keywords');

    assert.ok(result.keywords.length >= 1, `Expected keyword matches, got ${result.keywords.length}`);
    const combined = result.keywords.join(' ');
    assert.match(combined, /payment status is pending/i);
    assert.match(combined, /notification message/i);
  });

  test('extractSectionData returns the expected output shape', () => {
    const result = extractSectionData('<html><head><title>T</title></head><body><p>This is a sufficiently long paragraph.</p></body></html>', 'https://example.com/shape');

    assert.deepStrictEqual(Object.keys(result).sort(), ['allText', 'bodyLength', 'keywords', 'pageTitle', 'tableData', 'url']);
    assert.ok(Array.isArray(result.allText));
    assert.ok(Array.isArray(result.tableData));
    assert.ok(Array.isArray(result.keywords));
    assert.strictEqual(typeof result.pageTitle, 'string');
    assert.strictEqual(typeof result.url, 'string');
    assert.strictEqual(typeof result.bodyLength, 'number');
  });

  test('splitCombinedSetCookie handles commas in Expires attributes', () => {
    const combined = 'SESSION=abc123; Path=/; HttpOnly, PREF=dark; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/';
    assert.deepStrictEqual(splitCombinedSetCookie(combined), [
      'SESSION=abc123; Path=/; HttpOnly',
      'PREF=dark; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/'
    ]);
  });

  test('storeCookies parses Set-Cookie headers and getCookieHeader formats them', () => {
    const jar = createCookieJar();

    storeCookies(jar, [
      'SESSION=abc123; Path=/; HttpOnly',
      'THEME=light; Path=/'
    ], 'https://example.com/login');

    assert.deepStrictEqual(jar, {
      _domains: {
        'example.com': {
          SESSION: 'abc123',
          THEME: 'light'
        }
      },
      SESSION: 'abc123',
      THEME: 'light'
    });
    assert.strictEqual(getCookieHeader(jar, 'https://example.com/account'), 'SESSION=abc123; THEME=light');
  });

  test('multiple cookies accumulate and attributes are ignored when storing values', () => {
    const jar = createCookieJar();

    storeCookies(jar, [
      'SMSESSION=token123; Path=/; Secure; HttpOnly; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
      'LANG=en-CA; Path=/; SameSite=Lax',
      'PREF=compact; Expires=Tue, 01 Dec 2026 00:00:00 GMT; Path=/app'
    ], 'https://login.gov.bc.ca/logon.fcc');

    assert.deepStrictEqual(jar, {
      _domains: {
        'login.gov.bc.ca': {
          SMSESSION: 'token123',
          LANG: 'en-CA',
          PREF: 'compact'
        }
      },
      SMSESSION: 'token123',
      LANG: 'en-CA',
      PREF: 'compact'
    });
    assert.strictEqual(
      getCookieHeader(jar, 'https://myselfserve.gov.bc.ca/Auth'),
      'SMSESSION=token123; LANG=en-CA; PREF=compact'
    );
  });

  test('getCookieHeader merges flat SiteMinder cookies with domain-matched cookies on target app domain', () => {
    const jar = createCookieJar();

    storeCookies(jar, ['SMSESSION=token123; Path=/; HttpOnly'], 'https://logon7.gov.bc.ca/logon.fcc');
    storeCookies(jar, ['APPSESSID=app-456; Path=/'], 'https://myselfserve.gov.bc.ca/Auth');

    assert.strictEqual(
      getCookieHeader(jar, 'https://myselfserve.gov.bc.ca/Auth'),
      'SMSESSION=token123; APPSESSID=app-456'
    );
  });

  test('parseLoginForm extracts action hidden fields and username/password field names', () => {
    const html = `
      <html>
        <body>
          <form action="/auth/submit">
            <input type="hidden" name="csrf" value="token-1">
            <input type="hidden" name="relayState" value="state-9">
            <input type="text" name="UserName">
            <input type="password" name="Passcode">
          </form>
        </body>
      </html>
    `;

    const result = parseLoginForm(html, 'https://example.com/login');

    assert.deepStrictEqual(result, {
      action: 'https://example.com/auth/submit',
      hiddenFields: { csrf: 'token-1', relayState: 'state-9' },
      usernameField: 'UserName',
      passwordField: 'Passcode'
    });
  });

  test('parseSignInLink finds the first sign-in link and resolves it', () => {
    const html = `
      <html>
        <body>
          <a href="/help">Help</a>
          <a href="/auth/logon">Sign In</a>
          <a href="/auth/other">Log In Here</a>
        </body>
      </html>
    `;

    assert.strictEqual(parseSignInLink(html, 'https://example.com/start'), 'https://example.com/auth/logon');
  });

  test('mock fetchAllSections-style result matches extractMobileData-compatible section shape', () => {
    const paymentInfo = extractSectionData(`
      <html>
        <head><title>Payments</title></head>
        <body>
          <table>
            <tr><td>Amount:</td><td>$1,060.00</td></tr>
          </table>
          <p>This payment information paragraph is long enough to retain.</p>
        </body>
      </html>
    `, 'https://example.com/payment');

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      sections: {
        'Payment Info': paymentInfo,
        Messages: extractSectionData(`
          <html>
            <head><title>Messages</title></head>
            <body>
              <div class="message">2026 / MAR / 01
Your cheque is ready for pickup.</div>
            </body>
          </html>
        `, 'https://example.com/messages')
      }
    };

    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.timestamp, 'string');
    assert.ok(result.sections && typeof result.sections === 'object');

    Object.values(result.sections).forEach((section) => {
      assert.deepStrictEqual(Object.keys(section).sort(), ['allText', 'bodyLength', 'keywords', 'pageTitle', 'tableData', 'url']);
      assert.ok(Array.isArray(section.allText));
      assert.ok(Array.isArray(section.tableData));
      assert.ok(Array.isArray(section.keywords));
      assert.strictEqual(typeof section.pageTitle, 'string');
      assert.strictEqual(typeof section.url, 'string');
      assert.strictEqual(typeof section.bodyLength, 'number');
    });
  });

  // --- New hardening tests ---

  test('parseCookieExpiry extracts Expires date', () => {
    const { parseCookieExpiry } = require('../src/http-scraper');
    const expiry = parseCookieExpiry('SESSION=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/');
    assert.ok(expiry instanceof Date);
    assert.strictEqual(expiry.getUTCFullYear(), 2026);
    assert.strictEqual(expiry.getUTCMonth(), 9); // October = 9
  });

  test('parseCookieExpiry extracts Max-Age', () => {
    const { parseCookieExpiry } = require('../src/http-scraper');
    const before = Date.now();
    const expiry = parseCookieExpiry('SESSION=abc; Max-Age=3600; Path=/');
    assert.ok(expiry instanceof Date);
    assert.ok(expiry.getTime() >= before + 3600000 - 100);
    assert.ok(expiry.getTime() <= before + 3600000 + 1000);
  });

  test('parseCookieExpiry returns null when no expiry info', () => {
    const { parseCookieExpiry } = require('../src/http-scraper');
    assert.strictEqual(parseCookieExpiry('SESSION=abc; Path=/; HttpOnly'), null);
  });

  test('storeCookies skips cookies with past Expires dates', () => {
    const { storeCookies: moduleSC, createCookieJar: moduleCJ } = require('../src/http-scraper');
    const jar = moduleCJ();
    moduleSC(jar, [
      'ALIVE=yes; Path=/',
      'DEAD=no; Expires=Wed, 01 Jan 2020 00:00:00 GMT; Path=/'
    ], 'https://example.com/');

    assert.strictEqual(jar.ALIVE, 'yes');
    assert.strictEqual(jar.DEAD, undefined);
  });

  test('storeCookies removes existing cookie when server sends expired Set-Cookie', () => {
    const { storeCookies: moduleSC, createCookieJar: moduleCJ } = require('../src/http-scraper');
    const jar = moduleCJ();
    moduleSC(jar, ['TOKEN=abc123; Path=/'], 'https://example.com/');
    assert.strictEqual(jar.TOKEN, 'abc123');

    moduleSC(jar, ['TOKEN=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/'], 'https://example.com/');
    assert.strictEqual(jar.TOKEN, undefined);
  });

  test('isTransientError identifies timeout and network errors', () => {
    const { isTransientError } = require('../src/http-scraper');
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    assert.ok(isTransientError(abortErr));
    assert.ok(isTransientError(new Error('ECONNRESET')));
    assert.ok(isTransientError(new Error('socket hang up')));
    assert.ok(isTransientError(new Error('fetch failed')));
    assert.ok(!isTransientError(new Error('Login form not found')));
    assert.ok(!isTransientError(null));
  });

  test('isTransientStatus identifies retryable HTTP status codes', () => {
    const { isTransientStatus } = require('../src/http-scraper');
    assert.ok(isTransientStatus(429));
    assert.ok(isTransientStatus(502));
    assert.ok(isTransientStatus(503));
    assert.ok(isTransientStatus(504));
    assert.ok(!isTransientStatus(200));
    assert.ok(!isTransientStatus(404));
    assert.ok(!isTransientStatus(500));
  });

  test('backoffDelay produces increasing delays with jitter', () => {
    const { backoffDelay } = require('../src/http-scraper');
    const d0 = backoffDelay(0);
    const d1 = backoffDelay(1);
    const d2 = backoffDelay(2);

    // Base delay is 1000ms, so attempt 0 should be ~1000-1200
    assert.ok(d0 >= 1000 && d0 <= 1200, `attempt 0 delay ${d0} out of range`);
    // Attempt 1 should be ~2000-2400
    assert.ok(d1 >= 2000 && d1 <= 2400, `attempt 1 delay ${d1} out of range`);
    // Attempt 2 should be ~4000-4800
    assert.ok(d2 >= 4000 && d2 <= 4800, `attempt 2 delay ${d2} out of range`);
  });

  test('backoffDelay caps at RETRY_MAX_DELAY_MS', () => {
    const { backoffDelay } = require('../src/http-scraper');
    const d10 = backoffDelay(10);
    // Max is 15000 + up to 20% jitter = 18000
    assert.ok(d10 <= 18000, `attempt 10 delay ${d10} exceeds max`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
