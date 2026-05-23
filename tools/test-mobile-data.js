const assert = require('assert');

// Copy of extractMobileData from src/api.js for isolated testing.
// Avoids booting Express just to test pure data extraction.

function extractMobileData(scraperResult) {
  const sections = scraperResult?.sections || {};

  const paymentSection = sections['Payment Info'] || {};
  const paymentData = (paymentSection.tableData || []).filter(s => typeof s === 'string');
  const paymentAllText = (paymentSection.allText || []).filter(s => typeof s === 'string');
  const raw = [...paymentData, ...paymentAllText].join('\n');
  const amountMatch = raw.match(/Amount:\s*(\$[\d,]+(?:\.\d{2})?)/);
  const paymentAmount = amountMatch ? amountMatch[1] : null;

  const designationMatch = raw.match(/Persons?\s+with\s+Disabilities|PWD/i);
  const fallbackAmount = designationMatch ? '~$1,500-1,700/mo' : '~$1,000/mo';

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

  const MONTHS = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const messagesAllText = (sections.Messages && sections.Messages.allText) || [];
  const messages = messagesAllText
    .filter((entry) => typeof entry === 'string' && entry.includes('\n'))
    .map((entry, idx) => {
      const newlineIdx = entry.indexOf('\n');
      const rawDate = entry.substring(0, newlineIdx).trim();
      const text = entry.substring(newlineIdx + 1).trim();
      const dateParts = rawDate.replace(/\s*\/\s*/g, '-').replace(/(\d{4})-([A-Z]{3})-(\d{2})/, (_, y, m, d) => {
        return `${y}-${MONTHS[m] || '01'}-${d}`;
      });
      return { id: `msg-${idx}`, text, timestamp: dateParts };
    });

  return { payment_amount: paymentAmount || fallbackAmount, next_date: nextDate, messages };
}

// --- Test harness ---

function run() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [OK] ${name}`);
      passed++;
    } catch (e) {
      console.log(`  [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('Mobile Data Extraction Tests\n');

  // --- Regex tests ---

  test('regex matches $1,060.00 (with comma and decimals)', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: ['Amount: $1,060.00'], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '$1,060.00');
  });

  test('regex matches $1,060 (with comma, no decimals)', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: ['Amount: $1,060'], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '$1,060');
  });

  test('regex matches $1060 (no comma, no decimals)', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: ['Amount: $1060'], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '$1060');
  });

  // --- Fallback tests ---

  test('fallback returns ~$1,000/mo when no amount and no PWD', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: ['No data here'], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '~$1,000/mo');
  });

  test('fallback returns ~$1,500-1,700/mo when no amount but PWD designation present', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: ['Persons with Disabilities'], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '~$1,500-1,700/mo');
  });

  test('PWD fallback also triggers on "PWD" abbreviation', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { allText: ['Designation: PWD'], tableData: [] } }
    });
    assert.strictEqual(result.payment_amount, '~$1,500-1,700/mo');
  });

  // --- Missing/empty section tests ---

  test('missing sections returns fallback amount', () => {
    const result = extractMobileData({});
    assert.ok(result.payment_amount);
    assert.strictEqual(result.payment_amount, '~$1,000/mo');
  });

  test('null scraperResult returns fallback amount', () => {
    const result = extractMobileData(null);
    assert.strictEqual(result.payment_amount, '~$1,000/mo');
  });

  test('empty sections returns fallback amount', () => {
    const result = extractMobileData({ sections: {} });
    assert.strictEqual(result.payment_amount, '~$1,000/mo');
  });

  // --- Non-string entries in tableData/allText ---

  test('non-string entries in tableData are filtered out', () => {
    const result = extractMobileData({
      sections: { 'Payment Info': { tableData: [null, 42, 'Amount: $500.00', undefined], allText: [] } }
    });
    assert.strictEqual(result.payment_amount, '$500.00');
  });

  // --- Message parsing ---

  test('malformed message dates do not crash extraction', () => {
    const result = extractMobileData({
      sections: {
        'Payment Info': { tableData: ['Amount: $100.00'], allText: [] },
        Messages: { allText: ['garbage date format\nSome message text', 'not even a date\nAnother message'] }
      }
    });
    assert.strictEqual(result.messages.length, 2);
    assert.strictEqual(result.messages[0].text, 'Some message text');
  });

  test('valid message date is parsed to ISO format', () => {
    const result = extractMobileData({
      sections: {
        'Payment Info': { tableData: [], allText: [] },
        Messages: { allText: ['2026 / MAR / 01\nYour cheque is ready'] }
      }
    });
    assert.strictEqual(result.messages.length, 1);
    assert.strictEqual(result.messages[0].timestamp, '2026-03-01');
    assert.strictEqual(result.messages[0].text, 'Your cheque is ready');
  });

  // --- Next payment date ---

  test('next_date is a valid ISO date string', () => {
    const result = extractMobileData({ sections: {} });
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(result.next_date), `Expected ISO date, got: ${result.next_date}`);
  });

  // --- Summary ---

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
