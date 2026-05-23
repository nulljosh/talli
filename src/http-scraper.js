const cheerio = require('cheerio');

const BASE_URL = 'https://myselfserve.gov.bc.ca';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 10;
const LOGIN_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 15000;
const TRANSIENT_RETRY_COUNT = 2;
const CAPTURED_COOKIE_RESPONSES = new WeakSet();

const SECTION_CONFIG = [
  { name: 'Notifications', urls: [`${BASE_URL}/Auth`] },
  { name: 'Messages', urls: [`${BASE_URL}/Auth/Messages`] },
  {
    name: 'Payment Info',
    urls: [
      `${BASE_URL}/Auth/ChequeInfo`,
      `${BASE_URL}/Auth/Payment`,
      `${BASE_URL}/Auth/Payments`,
      `${BASE_URL}/Payment`,
      `${BASE_URL}/PaymentInfo`
    ]
  },
  { name: 'Service Requests', urls: [`${BASE_URL}/Auth/ServiceRequests`] }
];

const KEYWORD_REGEX = /(.{0,150}(payment|paid|pending|processed|deposit|amount|balance|invoice|status|notification|message).{0,150})/gi;

function log(message, ...args) {
  const ts = new Date().toISOString();
  console.log(`[HTTP ${ts}] ${message}`, ...args);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffDelay(attempt) {
  const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS);
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

function isTransientError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  // Session expiry is not transient -- do not retry
  if (msg.includes('session expired') || msg.includes('login page') || msg.includes('login form')) {
    return false;
  }
  return (
    error.name === 'AbortError' ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

function isTransientStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function createCookieJar() {
  // Domain-aware cookie jar: { domain -> { name -> value } }
  // Plus a flat view for backward compatibility
  return { _domains: {} };
}

function storeBrowserCookies(jar, cookies = []) {
  if (!jar || !Array.isArray(cookies)) return jar;

  for (const cookie of cookies) {
    if (!cookie || !cookie.name) continue;

    const name = String(cookie.name).trim();
    const value = cookie.value == null ? '' : String(cookie.value);
    if (!name) continue;

    const domain = String(cookie.domain || '').replace(/^\./, '').toLowerCase();
    if (domain) {
      if (!jar._domains) jar._domains = {};
      if (!jar._domains[domain]) jar._domains[domain] = {};
      jar._domains[domain][name] = value;
    }

    jar[name] = value;
    log(`Stored browser cookie: ${name}${domain ? ' (domain: ' + domain + ')' : ''}`);
  }

  return jar;
}

function hydrateCookieJar({ jar, cookies } = {}) {
  if (jar && typeof jar === 'object') return jar;
  const hydratedJar = createCookieJar();
  if (Array.isArray(cookies) && cookies.length > 0) {
    storeBrowserCookies(hydratedJar, cookies);
  }
  return hydratedJar;
}

function resolveUrl(url, base) {
  return new URL(url, base).toString();
}

function getHeaderCaseInsensitive(headers, name) {
  if (!headers) return null;
  const target = String(name).toLowerCase();
  for (const [key, value] of headers.entries()) {
    if (String(key).toLowerCase() === target) {
      return value;
    }
  }
  return null;
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

function getSetCookieHeaders(response) {
  if (!response || !response.headers) return [];

  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie().filter(Boolean);
  }

  const rawHeader = getHeaderCaseInsensitive(response.headers, 'set-cookie');
  return splitCombinedSetCookie(rawHeader);
}

function captureResponseCookies(jar, response, requestUrl) {
  if (!response || CAPTURED_COOKIE_RESPONSES.has(response)) return;

  const setCookieHeaders = getSetCookieHeaders(response);
  if (setCookieHeaders.length > 0) {
    storeCookies(jar, setCookieHeaders, requestUrl);
  }
  CAPTURED_COOKIE_RESPONSES.add(response);
}

function parseCookieExpiry(header) {
  const expiresMatch = header.match(/;\s*expires=([^;]+)/i);
  if (expiresMatch) {
    const date = new Date(expiresMatch[1].trim());
    if (!isNaN(date.getTime())) return date;
  }
  const maxAgeMatch = header.match(/;\s*max-age=(\d+)/i);
  if (maxAgeMatch) {
    return new Date(Date.now() + parseInt(maxAgeMatch[1], 10) * 1000);
  }
  return null;
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

    // Skip cookies that are already expired
    const expiry = parseCookieExpiry(header);
    if (expiry && expiry.getTime() < Date.now()) {
      log(`Skipping expired cookie: ${name} (expired ${expiry.toISOString()})`);
      // Remove from jar if it existed
      delete jar[name];
      if (jar._domains) {
        for (const domainCookies of Object.values(jar._domains)) {
          delete domainCookies[name];
        }
      }
      continue;
    }

    // Extract domain from cookie attributes or fall back to request domain
    let domain = '';
    const domainMatch = header.match(/;\s*domain=\.?([^;\s]+)/i);
    if (domainMatch) {
      domain = domainMatch[1].toLowerCase();
    } else if (requestUrl) {
      try { domain = new URL(requestUrl).hostname; } catch {}
    }

    // Store in domain bucket
    if (domain) {
      if (!jar._domains[domain]) jar._domains[domain] = {};
      jar._domains[domain][name] = value;
    }

    // Also store flat for backward compat and cross-domain SiteMinder flow
    jar[name] = value;
    log(`Stored cookie: ${name}${domain ? ' (domain: ' + domain + ')' : ''}`);
  }
}

function getCookieHeader(jar, requestUrl) {
  if (!requestUrl || !jar._domains) {
    // Flat mode fallback
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

  // Start with flat cookies for backward compatibility and BC SiteMinder's
  // cross-domain relay, then overlay domain-matched cookies for specificity.
  const matched = Object.fromEntries(
    Object.entries(jar).filter(([name]) => name !== '_domains')
  );

  // Collect cookies that match this domain (exact or parent domain)
  for (const [domain, cookies] of Object.entries(jar._domains)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      Object.assign(matched, cookies);
    }
  }
  return Object.entries(matched)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

const FETCH_PAGE_RETRIES = 3;

async function fetchPage(url, jar, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = getCookieHeader(jar, url);

  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  if (!headers.has('User-Agent')) {
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
  }

  const fetchOpts = { ...options, headers };
  let lastError = null;

  for (let attempt = 0; attempt < FETCH_PAGE_RETRIES; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = backoffDelay(attempt - 1);
        log(`fetchPage retry ${attempt}/${FETCH_PAGE_RETRIES - 1} for ${url} after ${Math.round(delay)}ms`);
        await sleep(delay);
      }

      const response = await fetchWithTimeout(url, fetchOpts);
      captureResponseCookies(jar, response, url);

      if (isTransientStatus(response.status) && attempt < FETCH_PAGE_RETRIES - 1) {
        log(`fetchPage transient HTTP ${response.status} from ${url}`);
        lastError = new Error(`HTTP ${response.status} from ${url}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (isTransientError(error) && attempt < FETCH_PAGE_RETRIES - 1) {
        log(`fetchPage transient error for ${url}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function readBody(response) {
  try {
    return await response.text();
  } catch (error) {
    const url = response && response.url ? response.url : 'unknown';
    const status = response && response.status ? response.status : 'unknown';
    log(`Failed to read response body from ${url} (HTTP ${status}): ${error.message}`);
    return '';
  }
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

async function followRedirectChain(response, jar, currentUrl) {
  let activeResponse = response;
  let activeUrl = currentUrl;
  let body = '';
  const visitedUrls = new Set();

  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    captureResponseCookies(jar, activeResponse, activeUrl);

    if (!isRedirectStatus(activeResponse.status)) {
      body = await readBody(activeResponse);
      return { response: activeResponse, body, url: activeUrl };
    }

    const location = activeResponse.headers.get('location');
    if (!location) {
      body = await readBody(activeResponse);
      return { response: activeResponse, body, url: activeUrl };
    }

    const nextUrl = resolveUrl(location, activeUrl);

    if (visitedUrls.has(nextUrl)) {
      log(`Redirect loop detected: ${nextUrl} already visited`);
      throw new Error(`Redirect loop detected at ${nextUrl} (visited ${visitedUrls.size} URLs)`);
    }
    visitedUrls.add(nextUrl);

    log(`Following redirect ${activeResponse.status} -> ${nextUrl} (hop ${i + 1}/${MAX_REDIRECTS})`);

    activeResponse = await fetchPage(nextUrl, jar, {
      method: 'GET',
      redirect: 'manual'
    });
    activeUrl = nextUrl;
  }

  log(`Max redirects (${MAX_REDIRECTS}) exceeded from ${currentUrl}`);
  body = await readBody(activeResponse);
  return { response: activeResponse, body, url: activeUrl };
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

function buildFormBody(fields) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.append(key, value == null ? '' : String(value));
  }
  return params.toString();
}

function pageLooksAuthenticated(url, html) {
  const lowerUrl = String(url || '').toLowerCase();
  const lowerHtml = String(html || '').toLowerCase();
  if (lowerUrl.includes('/auth')) return true;
  if (lowerHtml.includes('sign out') || lowerHtml.includes('logout')) return true;
  if (lowerHtml.includes('service requests') || lowerHtml.includes('payment info')) return true;
  return false;
}

function pageLooksLikeLogin(url, html) {
  const lowerUrl = String(url || '').toLowerCase();
  const lowerHtml = String(html || '').toLowerCase();
  return (
    lowerUrl.includes('logon') ||
    lowerUrl.includes('login') ||
    lowerHtml.includes('siteminder') ||
    lowerHtml.includes('please enter your user id and password') ||
    lowerHtml.includes('name="password"')
  );
}

function hasAutoSubmitForm(html) {
  // BC gov intermediate pages auto-submit forms via JS:
  //   document.login.submit(), document.postlogin.submit(), document.forms[0].submit()
  return /document\.[a-zA-Z0-9[\]]+\.submit\(\)/i.test(html) ||
         /onload.*submit/i.test(html);
}

function parseAutoSubmitForm(html, pageUrl) {
  const $ = cheerio.load(html);
  const $form = $('form').first();
  if (!$form.length) {
    throw new Error(`Auto-submit form not found in intermediate page at ${pageUrl}`);
  }

  let action = $form.attr('action') || '';
  const fields = {};

  $form.find('input').each((_, input) => {
    const $input = $(input);
    const name = $input.attr('name');
    if (name) {
      fields[name] = $input.attr('value') || '';
    }
  });

  // BC gov relay pages use he.decode() in scripts to set form values and action.
  // Parse decoded credentials (preLogon page).
  const credMatch = html.match(/he\.decode\("([^"]*)"\)[\s\S]*?he\.decode\("([^"]*)"\)/);
  if (credMatch) {
    fields.user = credMatch[1];
    fields.password = credMatch[2];
  }

  // Parse decoded TARGET for form action (postLogon page).
  // Pattern: var target = he.decode("HTTPS://..."); document.postlogin.action = target;
  const targetMatch = html.match(/var\s+target\s*=\s*he\.decode\("([^"]+)"\)/);
  if (targetMatch) {
    action = targetMatch[1];
  }

  action = action ? resolveUrl(action, pageUrl) : pageUrl;
  return { action, fields };
}

async function executeLogin(username, password) {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  const jar = createCookieJar();

  log(`GET ${BASE_URL}`);
  const homeResponse = await fetchPage(BASE_URL, jar, {
    method: 'GET',
    redirect: 'manual'
  });
  const homeHtml = await readBody(homeResponse);

  if (!homeResponse.ok) {
    throw new Error(`Homepage ${BASE_URL} returned HTTP ${homeResponse.status}`);
  }

  const signInUrl = parseSignInLink(homeHtml, BASE_URL);
  if (!signInUrl) {
    throw new Error('Sign in link not found');
  }

  log(`GET ${signInUrl}`);
  const loginPageResponse = await fetchPage(signInUrl, jar, {
    method: 'GET',
    redirect: 'manual'
  });

  const loginPage = await followRedirectChain(loginPageResponse, jar, signInUrl);
  const loginHtml = loginPage.body;

  if (!loginPage.response.ok) {
    throw new Error(`Login page ${loginPage.url} returned HTTP ${loginPage.response.status}`);
  }

  const form = parseLoginForm(loginHtml, loginPage.url);
  const formFields = {
    ...form.hiddenFields,
    [form.usernameField]: username,
    [form.passwordField]: password
  };

  if (!Object.prototype.hasOwnProperty.call(formFields, 'user')) {
    formFields.user = username;
  }
  if (!Object.prototype.hasOwnProperty.call(formFields, 'password')) {
    formFields.password = password;
  }

  log(`POST ${form.action}`);
  let postResponse = await fetchPage(form.action, jar, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: BASE_URL,
      Referer: loginPage.url
    },
    body: buildFormBody(formFields)
  });

  if (!isRedirectStatus(postResponse.status) && !postResponse.ok) {
    const failureBody = await readBody(postResponse);
    throw new Error(`Login POST to ${form.action} returned HTTP ${postResponse.status}: ${failureBody.slice(0, 200)}`);
  }

  let loginResult = await followRedirectChain(postResponse, jar, form.action);

  // BC gov login uses multiple JS auto-submit relay pages:
  //   preLogon.cgi -> logon.fcc -> postLogon.cgi -> myselfserve.gov.bc.ca/Auth
  // Loop through them until we land on a real page.
  const MAX_AUTO_SUBMITS = 5;
  for (let relay = 0; relay < MAX_AUTO_SUBMITS; relay++) {
    if (!loginResult.response.ok || !hasAutoSubmitForm(loginResult.body)) break;
    const relayForm = parseAutoSubmitForm(loginResult.body, loginResult.url);
    log(`POST ${relayForm.action} (auto-submit relay ${relay + 1})`);
    postResponse = await fetchPage(relayForm.action, jar, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: new URL(loginResult.url).origin,
        Referer: loginResult.url
      },
      body: buildFormBody(relayForm.fields)
    });
    loginResult = await followRedirectChain(postResponse, jar, relayForm.action);
  }

  const stillOnBceidLogon =
    /logon\d*\.gov\.bc\.ca/i.test(loginResult.url) &&
    pageLooksLikeLogin(loginResult.url, loginResult.body);
  const failReasonBad = jar.FAILREASON && jar.FAILREASON !== '0';

  if (stillOnBceidLogon || failReasonBad) {
    throw new Error('Invalid BCeID credentials');
  }

  if (!jar.SMSESSION) {
    const cookieNames = Object.keys(jar).filter(k => k !== '_domains');
    throw new Error(`SMSESSION cookie not found after login (have: ${cookieNames.join(', ') || 'none'})`);
  }

  // BC gov login may land on an intermediate relay page (e.g. postLogon.cgi)
  // that still looks like the login domain. If we have a valid SMSESSION and
  // FAILREASON=0, the session is valid even if we haven't reached the target app yet.
  let finalUrl = loginResult.url;
  if (jar.SMSESSION && jar.FAILREASON === '0') {
    // Session is valid. If we're not on the authenticated app yet, that's OK --
    // fetchProtectedPage will send the SMSESSION cookie on subsequent requests.
    if (!pageLooksAuthenticated(loginResult.url, loginResult.body)) {
      finalUrl = BASE_URL + '/Auth';
    }
  } else if (pageLooksLikeLogin(loginResult.url, loginResult.body) && !pageLooksAuthenticated(loginResult.url, loginResult.body)) {
    throw new Error('Login appears to have returned to the login page');
  }

  log('Login successful');
  return {
    jar,
    finalUrl
  };
}

async function loginWithRetries(username, password, attempts = LOGIN_RETRIES) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      log(`Login attempt ${attempt}/${attempts}`);
      return await executeLogin(username, password);
    } catch (error) {
      lastError = error;
      log(`Login attempt ${attempt} failed: ${error.message}`);
      if (attempt < attempts) {
        const delay = backoffDelay(attempt - 1);
        log(`Waiting ${Math.round(delay)}ms before retry`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Login failed after ${attempts} attempts`);
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

async function fetchProtectedPage(url, jar, retries = TRANSIENT_RETRY_COUNT) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = backoffDelay(attempt - 1);
        log(`Retry ${attempt}/${retries} for ${url} after ${Math.round(delay)}ms`);
        await sleep(delay);
      }

      log(`GET ${url}`);
      const response = await fetchPage(url, jar, {
        method: 'GET',
        redirect: 'manual'
      });

      // Retry on transient HTTP status codes
      if (isTransientStatus(response.status) && attempt < retries) {
        log(`Transient HTTP ${response.status} from ${url}`);
        lastError = new Error(`HTTP ${response.status} from ${url}`);
        continue;
      }

      const result = await followRedirectChain(response, jar, url);
      const finalUrl = result.url;
      const html = result.body;

      if (pageLooksLikeLogin(finalUrl, html) && !pageLooksAuthenticated(finalUrl, html)) {
        throw new Error(`Session expired - ${url} redirected to login page ${finalUrl}`);
      }

      if (!result.response.ok) {
        const status = result.response.status;
        if (isTransientStatus(status) && attempt < retries) {
          lastError = new Error(`HTTP ${status} from ${finalUrl}`);
          continue;
        }
        throw new Error(`${url} returned HTTP ${status} (final: ${finalUrl})`);
      }

      return { url: finalUrl, html };
    } catch (error) {
      lastError = error;
      if (isTransientError(error) && attempt < retries) {
        log(`Transient error fetching ${url}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function validateSession(jar) {
  if (!jar) {
    return { valid: false, reason: 'No cookie jar provided' };
  }
  if (!jar.SMSESSION) {
    return { valid: false, reason: 'SMSESSION cookie missing' };
  }
  if (jar.SMSESSION === 'LOGGEDOFF') {
    return { valid: false, reason: 'SMSESSION is LOGGEDOFF (explicit logout)' };
  }

  try {
    log('Health check: probing session validity');
    const response = await fetchPage(`${BASE_URL}/Auth`, jar, {
      method: 'GET',
      redirect: 'manual'
    });
    const result = await followRedirectChain(response, jar, `${BASE_URL}/Auth`);

    if (pageLooksLikeLogin(result.url, result.body) && !pageLooksAuthenticated(result.url, result.body)) {
      return { valid: false, reason: `Session invalid - redirected to ${result.url}` };
    }

    if (!result.response.ok) {
      return { valid: false, reason: `Auth page returned HTTP ${result.response.status}` };
    }

    if (pageLooksAuthenticated(result.url, result.body)) {
      log('Health check: session is valid');
      return { valid: true };
    }

    return { valid: false, reason: 'Auth page did not look authenticated' };
  } catch (error) {
    return { valid: false, reason: `Health check failed: ${error.message}` };
  }
}

async function fetchSection(section, jar) {
  let lastError = null;

  for (const url of section.urls) {
    try {
      const page = await fetchProtectedPage(url, jar);
      const data = extractSectionData(page.html, page.url);

      if (
        section.name === 'Payment Info' &&
        data.bodyLength < 50 &&
        data.allText.length === 0 &&
        data.tableData.length === 0 &&
        data.keywords.length === 0
      ) {
        throw new Error(`Payment page appears empty at ${url} (body: ${data.bodyLength} bytes)`);
      }

      return data;
    } catch (error) {
      lastError = error;
      log(`${section.name} fetch failed for ${url}: ${error.message}`);
    }
  }

  const triedUrls = section.urls.join(', ');
  throw lastError || new Error(`Failed to fetch ${section.name} (tried: ${triedUrls})`);
}

async function attemptHttpLogin(username, password) {
  try {
    await executeLogin(username, password);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function fetchAllSections(credentials = {}) {
  try {
    const { username, password, jar: providedJar, cookies } = credentials;
    let jar;
    let loginFresh = false;

    if (providedJar && typeof providedJar === 'object') {
      jar = providedJar;
    } else if (Array.isArray(cookies) && cookies.length > 0) {
      jar = hydrateCookieJar({ cookies });
    } else {
      jar = (await loginWithRetries(username, password, LOGIN_RETRIES)).jar;
      loginFresh = true;
    }

    // Validate session before scraping (skip if we just logged in)
    if (!loginFresh) {
      const health = await validateSession(jar);
      if (!health.valid) {
        log(`Session invalid (${health.reason}), attempting fresh login`);
        if (!username || !password) {
          throw new Error(`Session expired and no credentials for re-login: ${health.reason}`);
        }
        jar = (await loginWithRetries(username, password, LOGIN_RETRIES)).jar;
      }
    }

    const sections = {};
    const errors = [];

    for (const section of SECTION_CONFIG) {
      try {
        sections[section.name] = await fetchSection(section, jar);
      } catch (error) {
        log(`Section "${section.name}" failed: ${error.message}`);
        errors.push({ section: section.name, error: error.message });
      }
    }

    if (Object.keys(sections).length === 0) {
      throw new Error(`All sections failed: ${errors.map(e => `${e.section}: ${e.error}`).join('; ')}`);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      sections,
      ...(errors.length > 0 ? { partialErrors: errors } : {})
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  attemptHttpLogin,
  fetchAllSections,
  executeLogin,
  loginWithRetries,
  fetchProtectedPage,
  fetchSection,
  fetchWithTimeout,
  followRedirectChain,
  fetchPage,
  createCookieJar,
  pageLooksAuthenticated,
  pageLooksLikeLogin,
  buildFormBody,
  isRedirectStatus,
  isTransientError,
  isTransientStatus,
  storeCookies,
  storeBrowserCookies,
  hydrateCookieJar,
  getCookieHeader,
  validateSession,
  backoffDelay,
  parseCookieExpiry
};
