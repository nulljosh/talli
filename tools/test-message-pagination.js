// Messages pagination: /Auth/Messages renders only page 1 and hides the rest
// behind "Show More Messages", which is a plain
// `GET /Auth/Messages/MessageList?pageNumber=N` returning an HTML fragment.
//
// Fixtures below mirror the live portal's STRUCTURE (verified 2026-08-10) with
// invented subjects -- this repo is public and the real messages are medical
// and benefit correspondence.
//
// The behaviour that makes this non-trivial: the portal CLAMPS past the last
// page rather than returning an empty fragment. With 3 pages of data,
// pageNumber=4,5,6... all echo page 3 verbatim, so a loop that stops on "empty
// response" never stops.

const assert = require('assert');
const {
  extractSectionData,
  fetchMessagePages,
  createCookieJar
} = require('../src/http-scraper');
const { parseMessages, hasMoreMessages } = require('../src/parse-messages');

const BASE_URL = 'https://myselfserve.gov.bc.ca';

// One list row, exactly as the portal nests it: the row element carries the
// full "date + subject" text AND an inner div.subject carrying the subject
// alone. Both reach allText, which is what produced phantom dateless copies.
function row(id, date, subject) {
  return `
    <a href="/Auth/Messages/Read/${id}">
      <div class="message" data-id="${id}">
        <div class="date clearfix"><div class="small pull-right">${date}</div></div>
        <div class="clearfix"><div class="subject">${subject}</div></div>
      </div>
    </a>`;
}

const PAGE_1_ROWS = [
  row(1, '2026 / AUG / 05', 'Monthly Report Reminder'),
  row(2, '2026 / JUL / 29', 'Monthly Reporting Period Open'),
  row(3, '2026 / JUL / 14', '! ACTION REQUIRED: Monthly report')
].join('');

const PAGE_2_ROWS = [
  row(4, '2026 / APR / 05', 'Monthly Report Reminder'),
  row(5, '2026 / JAN / 06', 'Address Change Confirmed')
].join('');

// Short final page -- fewer rows than a full page.
const PAGE_3_ROWS = row(6, '2024 / JUL / 10', 'Benefit Statement Available');

// The full page also carries the session-timeout modal and the empty reading
// pane, both of which land in allText now that <button> text is extracted.
const MESSAGES_PAGE = `
  <html><body>
    <div id="MessageList">
      ${PAGE_1_ROWS}
      <div class="text-center">
        <button type="button" class="btn btn-default load-more">Show More Messages</button>
      </div>
    </div>
    <div id="MessageContainer">
      <div id="DefaultMessage" class="text-center"><span class="lead"><em>Select a message to read</em></span></div>
    </div>
    <div id="timeoutModal">
      <p>Due to inactivity you will be logged out in seconds.</p>
      <button type="button">Yes, I'm still here</button>
    </div>
  </body></html>`;

const FRAGMENTS = { 2: PAGE_2_ROWS, 3: PAGE_3_ROWS };

// Minimal stand-in for fetch's Headers: the scraper's cookie capture iterates
// headers.entries(), so `get` alone is not enough.
function mockHeaders() {
  return {
    get: () => null,
    entries: () => [][Symbol.iterator](),
    setCookies: []
  };
}

function mockFetchPages({ onFetch } = {}) {
  global.fetch = async (url) => {
    const href = String(url);
    if (onFetch) onFetch(href);

    const pageNumber = Number(new URL(href).searchParams.get('pageNumber'));
    // Clamp: anything past the last page repeats the last page.
    const body = FRAGMENTS[pageNumber] || FRAGMENTS[3];

    return {
      status: 200,
      ok: true,
      url: href,
      headers: mockHeaders(),
      text: async () => `<html><body>${body}</body></html>`
    };
  };
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    const realFetch = global.fetch;
    try {
      await fn();
      console.log(`  [OK] ${name}`);
      passed += 1;
    } catch (error) {
      console.log(`  [FAIL] ${name}: ${error.message}`);
      failed += 1;
    } finally {
      global.fetch = realFetch;
    }
  }

  console.log('Message pagination');

  await test('the "Show More Messages" button survives extraction', () => {
    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    // Regression: <button> matched no selector, so this string never reached
    // allText and hasMoreMessages() was false on every real scrape -- the
    // portal always looked fully paginated and page 2+ was never fetched.
    assert.ok(
      data.allText.some(line => /show more messages/i.test(line)),
      'button text missing from allText'
    );
    assert.strictEqual(hasMoreMessages(data.allText), true);
  });

  await test('page 1 alone parses one row per message, no dateless phantoms', () => {
    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    const messages = parseMessages(data.allText);
    assert.strictEqual(messages.length, 3, `expected 3, got ${messages.length}`);
    assert.ok(messages.every(m => m.timestamp), 'a dateless duplicate leaked through');
    assert.strictEqual(messages[0].timestamp, '2026-08-05');
    assert.strictEqual(messages[2].actionRequired, true);
  });

  await test('session-modal and empty-pane chrome are not messages', () => {
    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    const texts = parseMessages(data.allText).map(m => m.text);
    for (const chrome of ['Select a message to read', "Yes, I'm still here", 'Show More Messages']) {
      assert.ok(!texts.some(t => t.includes(chrome)), `chrome leaked as a message: ${chrome}`);
    }
    assert.ok(!texts.some(t => /inactivity/i.test(t)), 'timeout warning leaked as a message');
  });

  await test('walking the pages merges every message, oldest last', async () => {
    mockFetchPages();
    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    await fetchMessagePages(data, createCookieJar());

    const messages = parseMessages(data.allText);
    assert.strictEqual(messages.length, 6, `expected 6 messages, got ${messages.length}`);
    assert.strictEqual(messages[0].timestamp, '2026-08-05');
    assert.strictEqual(messages[messages.length - 1].timestamp, '2024-07-10');
  });

  await test('the clamp past the last page terminates the walk', async () => {
    const fetched = [];
    mockFetchPages({ onFetch: href => fetched.push(href) });
    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    await fetchMessagePages(data, createCookieJar());

    // Pages 2 and 3 carry new rows; page 4 repeats page 3, which ends it.
    // Without the no-new-rows check this runs to MAX_MESSAGE_PAGES every scrape.
    assert.strictEqual(fetched.length, 3, `fetched ${fetched.length} pages, expected 3`);
    assert.ok(fetched[fetched.length - 1].includes('pageNumber=4'));
  });

  await test('a mid-walk fetch failure keeps the pages already collected', async () => {
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;
      if (calls > 1) throw new Error('socket hang up');
      return {
        status: 200,
        ok: true,
        url: String(url),
        headers: mockHeaders(),
        text: async () => `<html><body>${PAGE_2_ROWS}</body></html>`
      };
    };

    const data = extractSectionData(MESSAGES_PAGE, `${BASE_URL}/Auth/Messages`);
    await fetchMessagePages(data, createCookieJar());

    // Page 2 merged before the failure; a partial list beats losing page 1 too.
    const messages = parseMessages(data.allText);
    assert.strictEqual(messages.length, 5, `expected 5 messages, got ${messages.length}`);
  });

  await test('no pagination request when the button is absent', async () => {
    let fetches = 0;
    mockFetchPages({ onFetch: () => { fetches += 1; } });
    const singlePage = MESSAGES_PAGE.replace(/<button[^>]*class="btn btn-default load-more"[^>]*>[\s\S]*?<\/button>/, '');
    const data = extractSectionData(singlePage, `${BASE_URL}/Auth/Messages`);

    assert.strictEqual(hasMoreMessages(data.allText), false);
    assert.strictEqual(fetches, 0);
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
