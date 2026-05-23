const assert = require('assert');
const {
  executeLogin,
  loginWithRetries,
  fetchProtectedPage,
  fetchSection,
  fetchWithTimeout,
  followRedirectChain,
  fetchPage,
  createCookieJar,
  hydrateCookieJar,
  pageLooksAuthenticated,
  getCookieHeader,
  validateSession
} = require('../src/http-scraper');

const BASE_URL = 'https://myselfserve.gov.bc.ca';
const LOGIN_HOST = 'https://logon7.gov.bc.ca';
const LOGIN_PAGE_HTML = `
  <html>
    <head><title>SiteMinder Login</title></head>
    <body>
      <p>Please enter your user ID and password</p>
      <form action="https://myselfserve.gov.bc.ca/auth/submit" method="post">
        <input type="hidden" name="csrf" value="csrf-123">
        <input type="hidden" name="relayState" value="relay-456">
        <input type="text" name="user">
        <input type="password" name="password">
      </form>
    </body>
  </html>
`;
const AUTH_PAGE_HTML = `
  <html>
    <head><title>Dashboard</title></head>
    <body>
      <a href="/logout">Sign Out</a>
      <div>Service Requests</div>
      <div>Payment Info</div>
    </body>
  </html>
`;

class MockHeaders {
  constructor(init = {}) {
    this.values = new Map();
    this.setCookies = [];

    for (const [key, value] of Object.entries(init)) {
      const lowerKey = String(key).toLowerCase();
      if (lowerKey === 'set-cookie') {
        const cookieValues = Array.isArray(value) ? value : [value];
        this.setCookies.push(...cookieValues.filter(Boolean).map(String));
      } else {
        this.values.set(lowerKey, String(value));
      }
    }
  }

  get(name) {
    const key = String(name).toLowerCase();
    if (key === 'set-cookie') {
      return this.setCookies.length > 0 ? this.setCookies.join(', ') : null;
    }
    return this.values.has(key) ? this.values.get(key) : null;
  }

  entries() {
    const pairs = [...this.values.entries()];
    if (this.setCookies.length > 0) {
      pairs.push(['set-cookie', this.setCookies.join(', ')]);
    }
    return pairs[Symbol.iterator]();
  }

  getSetCookie() {
    return [...this.setCookies];
  }
}

function createMockResponse({ status = 200, headers = {}, body = '' }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new MockHeaders(headers),
    text: async () => String(body)
  };
}

function installMockFetch(handler) {
  const calls = [];

  global.fetch = async (url, options = {}) => {
    const call = {
      url: typeof url === 'string' ? url : url.toString(),
      method: String(options.method || 'GET').toUpperCase(),
      options
    };

    calls.push(call);
    const response = await handler(call, calls);
    if (!response) {
      throw new Error(`Unexpected fetch: ${call.method} ${call.url}`);
    }

    return createMockResponse(response);
  };

  return calls;
}

function getRequestHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get(name);
  }

  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) {
      return value;
    }
  }

  return null;
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    const realFetch = global.fetch;
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;

    try {
      await fn({ realSetTimeout, realClearTimeout });
      console.log(`  [OK] ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`  [FAIL] ${name}: ${error.message}`);
      failed += 1;
    } finally {
      global.fetch = realFetch;
      global.setTimeout = realSetTimeout;
      global.clearTimeout = realClearTimeout;
    }
  }

  console.log('HTTP Scraper Integration Tests\n');

  await test('executeLogin completes the full login flow and collects cookies', async () => {
    const calls = installMockFetch((call) => {
      if (call.url === BASE_URL && call.method === 'GET') {
        return {
          status: 200,
          headers: {
            'set-cookie': ['HOME=home-cookie; Path=/']
          },
          body: '<html><body><a href="/signin">Sign In</a></body></html>'
        };
      }

      if (call.url === `${BASE_URL}/signin` && call.method === 'GET') {
        return {
          status: 302,
          headers: {
            location: '/login',
            'set-cookie': ['SIGNIN_STEP=1; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/login` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'HOME=home-cookie; SIGNIN_STEP=1');
        return {
          status: 200,
          headers: {
            'set-cookie': ['LOGIN_PAGE=seen; Path=/']
          },
          body: LOGIN_PAGE_HTML
        };
      }

      if (call.url === `${BASE_URL}/auth/submit` && call.method === 'POST') {
        const body = new URLSearchParams(call.options.body);
        assert.strictEqual(body.get('csrf'), 'csrf-123');
        assert.strictEqual(body.get('relayState'), 'relay-456');
        assert.strictEqual(body.get('user'), 'alice');
        assert.strictEqual(body.get('password'), 'wonderland');
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'HOME=home-cookie; SIGNIN_STEP=1; LOGIN_PAGE=seen');

        return {
          status: 302,
          headers: {
            location: '/Auth',
            'set-cookie': ['SMSESSION=session-abc; Path=/; HttpOnly', 'POST_LOGIN=1; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/Auth` && call.method === 'GET') {
        assert.strictEqual(
          getRequestHeader(call.options.headers, 'Cookie'),
          'HOME=home-cookie; SIGNIN_STEP=1; LOGIN_PAGE=seen; SMSESSION=session-abc; POST_LOGIN=1'
        );

        return {
          status: 200,
          headers: {
            'set-cookie': ['AUTH_PAGE=loaded; Path=/']
          },
          body: AUTH_PAGE_HTML
        };
      }

      return null;
    });

    const result = await executeLogin('alice', 'wonderland');

    assert.strictEqual(result.finalUrl, `${BASE_URL}/Auth`);
    assert.ok(pageLooksAuthenticated(result.finalUrl, AUTH_PAGE_HTML));
    assert.strictEqual(result.jar.SMSESSION, 'session-abc');
    assert.deepStrictEqual(result.jar, {
      _domains: {
        'myselfserve.gov.bc.ca': {
          HOME: 'home-cookie',
          SIGNIN_STEP: '1',
          LOGIN_PAGE: 'seen',
          SMSESSION: 'session-abc',
          POST_LOGIN: '1',
          AUTH_PAGE: 'loaded'
        }
      },
      HOME: 'home-cookie',
      SIGNIN_STEP: '1',
      LOGIN_PAGE: 'seen',
      SMSESSION: 'session-abc',
      POST_LOGIN: '1',
      AUTH_PAGE: 'loaded'
    });
    assert.strictEqual(calls.length, 5);
  });

  await test('executeLogin throws when login lands back on the login page', async () => {
    installMockFetch((call) => {
      if (call.url === BASE_URL && call.method === 'GET') {
        return {
          status: 200,
          body: '<html><body><a href="/signin">Sign In</a></body></html>'
        };
      }

      if (call.url === `${BASE_URL}/signin` && call.method === 'GET') {
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      if (call.url === `${BASE_URL}/auth/submit` && call.method === 'POST') {
        return {
          status: 302,
          headers: {
            location: '/login?retry=1',
            'set-cookie': ['SMSESSION=looping-session; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/login?retry=1` && call.method === 'GET') {
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      return null;
    });

    await assert.rejects(
      () => executeLogin('alice', 'wrong-password'),
      (error) => {
        assert.strictEqual(error.message, 'Login appears to have returned to the login page');
        return true;
      }
    );
  });

  await test('loginWithRetries retries after a failed login and succeeds on the next attempt', async () => {
    let attempt = 0;

    installMockFetch((call) => {
      if (call.url === BASE_URL && call.method === 'GET') {
        attempt += 1;
        return {
          status: 200,
          body: '<html><body><a href="/signin">Sign In</a></body></html>'
        };
      }

      if (call.url === `${BASE_URL}/signin` && call.method === 'GET') {
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      if (call.url === `${BASE_URL}/auth/submit` && call.method === 'POST') {
        if (attempt === 1) {
          return {
            status: 302,
            headers: {
              location: '/login?retry=1',
              'set-cookie': ['SMSESSION=failed-session; Path=/']
            }
          };
        }

        return {
          status: 302,
          headers: {
            location: '/Auth',
            'set-cookie': ['SMSESSION=good-session; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/login?retry=1` && call.method === 'GET') {
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      if (call.url === `${BASE_URL}/Auth` && call.method === 'GET') {
        return {
          status: 200,
          body: AUTH_PAGE_HTML
        };
      }

      return null;
    });

    const result = await loginWithRetries('alice', 'wonderland', 2);

    assert.strictEqual(attempt, 2);
    assert.strictEqual(result.finalUrl, `${BASE_URL}/Auth`);
    assert.strictEqual(result.jar.SMSESSION, 'good-session');
  });

  await test('fetchProtectedPage throws when the session has expired and redirects to login', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'expired-session';

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth/Messages` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'SMSESSION=expired-session');
        return {
          status: 302,
          headers: {
            location: '/login?timeout=1'
          }
        };
      }

      if (call.url === `${BASE_URL}/login?timeout=1` && call.method === 'GET') {
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      return null;
    });

    await assert.rejects(
      () => fetchProtectedPage(`${BASE_URL}/Auth/Messages`, jar),
      (error) => {
        assert.match(error.message, /Session expired/);
        return true;
      }
    );
  });

  await test('fetchSection falls back to the next URL when the first one fails', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'live-session';

    const calls = installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth/Messages` && call.method === 'GET') {
        return {
          status: 404,
          body: '<html><body>Missing page</body></html>'
        };
      }

      if (call.url === `${BASE_URL}/Auth/MessagesAlt` && call.method === 'GET') {
        return {
          status: 200,
          body: `
            <html>
              <head><title>Messages</title></head>
              <body>
                <div class="message">This message is long enough to be retained by the scraper integration test.</div>
              </body>
            </html>
          `
        };
      }

      return null;
    });

    const result = await fetchSection(
      {
        name: 'Messages',
        urls: [`${BASE_URL}/Auth/Messages`, `${BASE_URL}/Auth/MessagesAlt`]
      },
      jar
    );

    assert.strictEqual(calls.length, 2);
    assert.strictEqual(result.url, `${BASE_URL}/Auth/MessagesAlt`);
    assert.deepStrictEqual(result.allText, [
      'This message is long enough to be retained by the scraper integration test.'
    ]);
  });

  await test('fetchSection rejects near-empty Payment Info pages', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'live-session';

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth/Payment` && call.method === 'GET') {
        return {
          status: 200,
          body: '<html><head><title>Payment Info</title></head><body></body></html>'
        };
      }

      return null;
    });

    await assert.rejects(
      () => fetchSection({ name: 'Payment Info', urls: [`${BASE_URL}/Auth/Payment`] }, jar),
      (error) => {
        assert.ok(error.message.startsWith('Payment page appears empty'));
        return true;
      }
    );
  });

  await test('followRedirectChain follows multiple redirects and accumulates cookies', async () => {
    const jar = createCookieJar();

    const calls = installMockFetch((call) => {
      if (call.url === `${BASE_URL}/redirect/start` && call.method === 'GET') {
        return {
          status: 302,
          headers: {
            location: '/redirect/one',
            'set-cookie': ['A=1; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/redirect/one` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'A=1');
        return {
          status: 302,
          headers: {
            location: '/redirect/two',
            'set-cookie': ['B=2; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/redirect/two` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'A=1; B=2');
        return {
          status: 302,
          headers: {
            location: '/redirect/final',
            'set-cookie': ['C=3; Path=/']
          }
        };
      }

      if (call.url === `${BASE_URL}/redirect/final` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'A=1; B=2; C=3');
        return {
          status: 200,
          headers: {
            'set-cookie': ['D=4; Path=/']
          },
          body: '<html><body>redirect-chain-complete</body></html>'
        };
      }

      return null;
    });

    const firstResponse = await fetchPage(`${BASE_URL}/redirect/start`, jar, {
      method: 'GET',
      redirect: 'manual'
    });
    const result = await followRedirectChain(firstResponse, jar, `${BASE_URL}/redirect/start`);

    assert.strictEqual(calls.length, 4);
    assert.strictEqual(result.url, `${BASE_URL}/redirect/final`);
    assert.strictEqual(result.body, '<html><body>redirect-chain-complete</body></html>');
    assert.deepStrictEqual(jar, {
      _domains: {
        'myselfserve.gov.bc.ca': {
          A: '1',
          B: '2',
          C: '3',
          D: '4'
        }
      },
      A: '1',
      B: '2',
      C: '3',
      D: '4'
    });
    assert.strictEqual(getCookieHeader(jar, `${BASE_URL}/redirect/final`), 'A=1; B=2; C=3; D=4');
  });

  await test('executeLogin carries SMSESSION from SiteMinder host to myselfserve.gov.bc.ca', async () => {
    const calls = installMockFetch((call) => {
      if (call.url === BASE_URL && call.method === 'GET') {
        return {
          status: 200,
          body: '<html><body><a href="/signin">Sign In</a></body></html>'
        };
      }

      if (call.url === `${BASE_URL}/signin` && call.method === 'GET') {
        return {
          status: 302,
          headers: {
            location: `${LOGIN_HOST}/preLogon.cgi`,
            'set-cookie': ['SIGNIN_STEP=1; Path=/']
          }
        };
      }

      if (call.url === `${LOGIN_HOST}/preLogon.cgi` && call.method === 'GET') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'SIGNIN_STEP=1');
        return {
          status: 200,
          body: LOGIN_PAGE_HTML
        };
      }

      if (call.url === `${BASE_URL}/auth/submit` && call.method === 'POST') {
        assert.strictEqual(getRequestHeader(call.options.headers, 'Cookie'), 'SIGNIN_STEP=1');
        return {
          status: 302,
          headers: {
            location: `${BASE_URL}/Auth`,
            'set-cookie': ['SMSESSION=cross-domain-session; Path=/; HttpOnly']
          }
        };
      }

      if (call.url === `${BASE_URL}/Auth` && call.method === 'GET') {
        assert.strictEqual(
          getRequestHeader(call.options.headers, 'Cookie'),
          'SIGNIN_STEP=1; SMSESSION=cross-domain-session'
        );
        return {
          status: 200,
          body: AUTH_PAGE_HTML
        };
      }

      return null;
    });

    const result = await executeLogin('alice', 'wonderland');

    assert.strictEqual(calls.length, 5);
    assert.strictEqual(result.finalUrl, `${BASE_URL}/Auth`);
    assert.strictEqual(result.jar.SMSESSION, 'cross-domain-session');
    assert.strictEqual(
      getCookieHeader(result.jar, `${BASE_URL}/Auth`),
      'SIGNIN_STEP=1; SMSESSION=cross-domain-session'
    );
  });

  await test('hydrateCookieJar accepts Puppeteer cookies and preserves cross-domain auth cookies', async () => {
    const jar = hydrateCookieJar({
      cookies: [
        { name: 'SMSESSION', value: 'puppeteer-session', domain: '.gov.bc.ca' },
        { name: 'SIGNIN_STEP', value: '1', domain: 'myselfserve.gov.bc.ca' }
      ]
    });

    assert.strictEqual(jar.SMSESSION, 'puppeteer-session');
    assert.strictEqual(
      getCookieHeader(jar, `${BASE_URL}/Auth`),
      'SMSESSION=puppeteer-session; SIGNIN_STEP=1'
    );
  });

  await test('fetchSection works with a pre-hydrated browser cookie jar', async () => {
    const jar = hydrateCookieJar({
      cookies: [
        { name: 'SMSESSION', value: 'puppeteer-session', domain: '.gov.bc.ca' },
        { name: 'AUTH_PAGE', value: 'loaded', domain: 'myselfserve.gov.bc.ca' }
      ]
    });

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth/Messages` && call.method === 'GET') {
        assert.strictEqual(
          getRequestHeader(call.options.headers, 'Cookie'),
          'SMSESSION=puppeteer-session; AUTH_PAGE=loaded'
        );
        return {
          status: 200,
          body: `
            <html>
              <head><title>Messages</title></head>
              <body>
                <div class="message">Hydrated cookie auth reached the protected messages page successfully.</div>
              </body>
            </html>
          `
        };
      }

      return null;
    });

    const result = await fetchSection(
      {
        name: 'Messages',
        urls: [`${BASE_URL}/Auth/Messages`]
      },
      jar
    );

    assert.strictEqual(result.url, `${BASE_URL}/Auth/Messages`);
    assert.deepStrictEqual(result.allText, [
      'Hydrated cookie auth reached the protected messages page successfully.'
    ]);
  });

  await test('fetchWithTimeout aborts a hanging fetch', async ({ realSetTimeout, realClearTimeout }) => {
    let scheduledMs = null;
    let sawAbort = false;

    global.setTimeout = (fn, ms, ...args) => {
      scheduledMs = ms;
      return realSetTimeout(fn, 0, ...args);
    };
    global.clearTimeout = (handle) => realClearTimeout(handle);
    global.fetch = (url, options = {}) => new Promise((resolve, reject) => {
      const abort = () => {
        sawAbort = true;
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      };

      if (options.signal && options.signal.aborted) {
        abort();
        return;
      }

      if (options.signal) {
        options.signal.addEventListener('abort', abort, { once: true });
      }
    });

    await assert.rejects(
      () => fetchWithTimeout(`${BASE_URL}/hang`),
      (error) => {
        assert.strictEqual(error.name, 'AbortError');
        return true;
      }
    );

    assert.strictEqual(scheduledMs, 15000);
    assert.ok(sawAbort, 'Expected hanging fetch to observe abort signal');
  });

  await test('followRedirectChain detects redirect loops', async () => {
    const jar = createCookieJar();

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/loop/a` && call.method === 'GET') {
        return {
          status: 302,
          headers: { location: '/loop/b' }
        };
      }
      if (call.url === `${BASE_URL}/loop/b` && call.method === 'GET') {
        return {
          status: 302,
          headers: { location: '/loop/a' }
        };
      }
      return null;
    });

    const firstResponse = await fetchPage(`${BASE_URL}/loop/a`, jar, {
      method: 'GET',
      redirect: 'manual'
    });

    await assert.rejects(
      () => followRedirectChain(firstResponse, jar, `${BASE_URL}/loop/a`),
      (error) => {
        assert.match(error.message, /Redirect loop detected/);
        return true;
      }
    );
  });

  await test('fetchProtectedPage retries on transient 503 then succeeds', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'valid-session';
    let callCount = 0;

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth/Messages` && call.method === 'GET') {
        callCount += 1;
        if (callCount === 1) {
          return { status: 503, body: 'Service Unavailable' };
        }
        return {
          status: 200,
          body: `<html><head><title>Messages</title></head><body>
            <a href="/logout">Sign Out</a>
            <div class="message">This message survived a transient 503 and was fetched on retry.</div>
          </body></html>`
        };
      }
      return null;
    });

    const result = await fetchProtectedPage(`${BASE_URL}/Auth/Messages`, jar, 2);
    assert.strictEqual(callCount, 2);
    assert.ok(result.html.includes('survived a transient 503'));
  });

  await test('fetchProtectedPage does not retry on session expiry', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'expired-session';
    let callCount = 0;

    installMockFetch((call) => {
      if (call.method === 'GET') {
        callCount += 1;
        if (call.url.includes('login')) {
          return { status: 200, body: LOGIN_PAGE_HTML };
        }
        return {
          status: 302,
          headers: { location: '/login?timeout=1' }
        };
      }
      return null;
    });

    await assert.rejects(
      () => fetchProtectedPage(`${BASE_URL}/Auth/Messages`, jar, 2),
      (error) => {
        assert.match(error.message, /Session expired/);
        return true;
      }
    );
    // Should not have retried -- session expiry is not transient
    assert.strictEqual(callCount, 2); // initial + redirect to login
  });

  await test('validateSession returns valid for authenticated session', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'good-session';

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth` && call.method === 'GET') {
        return { status: 200, body: AUTH_PAGE_HTML };
      }
      return null;
    });

    const result = await validateSession(jar);
    assert.strictEqual(result.valid, true);
  });

  await test('validateSession returns invalid when SMSESSION missing', async () => {
    const jar = createCookieJar();
    const result = await validateSession(jar);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /SMSESSION cookie missing/);
  });

  await test('validateSession returns invalid for LOGGEDOFF session', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'LOGGEDOFF';
    const result = await validateSession(jar);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /LOGGEDOFF/);
  });

  await test('validateSession returns invalid when redirected to login', async () => {
    const jar = createCookieJar();
    jar.SMSESSION = 'stale-session';

    installMockFetch((call) => {
      if (call.url === `${BASE_URL}/Auth` && call.method === 'GET') {
        return {
          status: 302,
          headers: { location: '/login?timeout=1' }
        };
      }
      if (call.url.includes('login')) {
        return { status: 200, body: LOGIN_PAGE_HTML };
      }
      return null;
    });

    const result = await validateSession(jar);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /Session invalid/);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
