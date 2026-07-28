// Parsing for the BC My Self Serve (myselfserve.gov.bc.ca) Messages tab.
//
// CRITICAL INPUT SHAPE: every extraction path in http-scraper.js runs
// `.text().replace(/\s+/g, ' ')`, so an `allText` entry can NEVER contain a
// newline. Each entry is one visual line -- either a bare date, a bare
// subject, or (when the portal wraps both in one element) a date and subject
// collapsed onto a single line.
//
// The previous mobile parser split each entry on '\n' to separate date from
// subject. That branch was unreachable, so every message shipped with
// `timestamp: null` and the date glued to the front of the text, and bare
// date lines became their own bogus message rows.
//
// Portal row anatomy:
//   2026 / JUL / 14          <- date, uppercase 3-letter month, spaced slashes
//   ! ACTION REQUIRED: Mo…   <- optional "!" action flag, subject truncated
//                               with an ellipsis in the list view

const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

// A date anchored at the start of a line, with the rest of the line captured.
// `\s*` around the slashes because the portal's spacing is not guaranteed.
const LEADING_DATE_RX = /^\s*!?\s*(\d{4})\s*\/\s*([A-Z]{3})\s*\/\s*(\d{2})\s*(.*)$/;

// Portal side-nav / a11y chrome that leaks in as <li> text alongside real rows.
//
// Full-line match, allowing only a trailing badge count. The previous version
// ended in `\b`, which made the "monthly reports?" nav-tab pattern also match
// the real subject "Monthly Report Reminder" -- by far the most common message
// on the portal -- silently dropping it from the list and the badge count.
const NAV_LABEL_RX = /^(skip to (main content|navigation|content)|home|payment info|messages?|notifications?|service requests?|monthly reports?|sign out|profile|back|print|help|my self serve|employment plans?|account info|terms of use|accessibility( statement)?|privacy|logout|menu|show more( messages)?)\s*\(?\d*\)?\s*$/i;

// Interstitial boilerplate that legitimately leads a longer sentence, so these
// stay prefix matches ("JavaScript is disabled…", "Inactivity warning…").
const BOILERPLATE_RX = /^(inactiv|logged out|javascript|service canada)/i;

function isNavChrome(line) {
  return NAV_LABEL_RX.test(line) || BOILERPLATE_RX.test(line);
}

// The list view only renders the first page; the rest sits behind this button.
const SHOW_MORE_RX = /show\s+more\s+messages?/i;

// djb2. Stable across refreshes so iOS read-state (readMessageIds) keeps
// matching -- random UUIDs here would mark every message unread on every load.
function msgHash(s) {
  let h = 5381;
  const t = s.slice(0, 80);
  for (let i = 0; i < t.length; i++) h = (h * 33 ^ t.charCodeAt(i)) >>> 0;
  return String(h);
}

// "2026 / JUL / 14" -> "2026-07-14". Returns null for an unknown month.
function toISODate(year, mon, day) {
  const month = MONTHS[String(mon).toUpperCase()];
  return month ? `${year}-${month}-${day}` : null;
}

// Strips the leading "!" action-required marker, reporting it separately so
// the subject itself is never corrupted. Leaves the ellipsis alone.
function splitActionFlag(text) {
  const m = /^\s*!\s*(.*)$/.exec(text);
  return m ? { actionRequired: true, subject: m[1].trim() } : { actionRequired: false, subject: text.trim() };
}

function isJunk(line) {
  return !line || !line.trim() || isNavChrome(line.trim());
}

/**
 * Parse Messages/Notifications `allText` lines into message records.
 *
 * Returns [{ id, text, timestamp, actionRequired }], newest-first order
 * preserved as the portal listed them.
 */
function parseMessages(lines = []) {
  const entries = lines.filter(l => typeof l === 'string');
  const out = [];
  let pendingDate = null;
  let pendingFlag = false;

  const push = (date, rawSubject, flagged) => {
    const { actionRequired, subject } = splitActionFlag(rawSubject);
    if (!subject || isNavChrome(subject)) return;
    out.push({
      // Keyed on date+subject: "Monthly Report Reminder" legitimately recurs
      // month after month, so subject alone would collapse distinct messages.
      id: msgHash(`${date || ''}|${subject}`),
      text: subject,
      timestamp: date,
      actionRequired: actionRequired || flagged
    });
  };

  for (const entry of entries) {
    const line = entry.trim();
    if (!line) continue;

    const dated = LEADING_DATE_RX.exec(line);
    if (dated) {
      const [, year, mon, day, rest] = dated;
      const date = toISODate(year, mon, day);
      const flagged = /^\s*!/.test(line);

      if (rest && rest.trim()) {
        // Date and subject collapsed onto one line.
        push(date, rest, flagged);
        pendingDate = null;
        pendingFlag = false;
      } else {
        // Bare date line -- the subject is the next non-junk line.
        pendingDate = date;
        pendingFlag = flagged;
      }
      continue;
    }

    if (isJunk(line)) continue;

    push(pendingDate, line, pendingFlag);
    pendingDate = null;
    pendingFlag = false;
  }

  // Same message can arrive from both the Messages and Notifications sections,
  // and http-scraper's overlapping selectors repeat rows within a section.
  const seen = new Set();
  return out.filter(m => {
    const key = `${m.timestamp || ''}|${m.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// True when the portal is holding back rows behind "Show More Messages", i.e.
// what we parsed is only the first page and counts/latest state may be stale.
function hasMoreMessages(lines = []) {
  return lines.some(l => typeof l === 'string' && SHOW_MORE_RX.test(l));
}

// Count of real message rows. Single source of truth so the badge count and
// the rendered list can never disagree.
function countMessages(lines = []) {
  return parseMessages(lines).length;
}

module.exports = {
  parseMessages,
  hasMoreMessages,
  countMessages,
  msgHash,
  MONTHS,
  NAV_LABEL_RX,
  BOILERPLATE_RX
};
