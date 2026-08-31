// The login loop: express-session splits the response body (all-but-last-byte,
// save, then the last byte) whenever Content-Length is set, and workerd's
// node:http bridge drops that trailing write -- so every authenticated JSON
// response came back one byte short. The guard is: never set Content-Length.
const assert = require('assert');
const http = require('http');

// node re-adds Content-Length at the socket layer, so assert the suppression
// in the source: it is what express-session reads to decide whether to split.
const src = require('fs').readFileSync(require('path').join(__dirname, '../src/api.js'), 'utf8');
assert.ok(/content-length'\s*\?\s*res/.test(src.toLowerCase()),
  'the Content-Length suppression middleware is gone -- Workers will truncate every authenticated response');

const PORT = 3199;
process.env.PORT = String(PORT);
require('../src/api.js'); // calls app.listen(PORT)

http.get({ port: PORT, path: '/api/me' }, (res) => {
  let body = '';
  res.on('data', (c) => { body += c; });
  res.on('end', () => {
    assert.doesNotThrow(() => JSON.parse(body), `truncated body: ${body}`);
    console.log('test-response-split: ok');
    process.exit(0);
  });
});
