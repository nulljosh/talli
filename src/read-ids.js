// The web posted read-message ids as numbers (`.map(Number)`) while iOS sends
// and decodes [String]. /api/read-messages stored whichever client wrote last,
// so iOS's decode threw on a numeric id and loadReadMessages() swallowed it as
// "non-critical" -- every message read on the web stayed unread on the phone.
// ponytail: one canonical type (String), normalized on the way in and out,
// which also heals the mixed-type blobs already sitting in KV.
function normalizeReadIds(data) {
  return {
    ...data,
    readIds: Array.from(new Set((data?.readIds || []).map(String)))
  };
}

module.exports = { normalizeReadIds };
