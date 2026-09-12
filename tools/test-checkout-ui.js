// Run the dashboard's actual checkout callbacks without a browser or a real charge.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../web/unified.html'), 'utf8');
const start = html.indexOf('function HomeTab(');
const end = html.indexOf('  const counted', start);
const source = html.slice(start, end) + 'return { unlockPro }; }';
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(fetch, returning = false) {
  const state = [], effects = [], timers = [];
  const location = { href: 'https://talli.heyitsmejosh.com/app' + (returning ? '?pro=1' : ''), search: returning ? '?pro=1' : '' };
  const sandbox = {
    fetch, URL, URLSearchParams, tk: () => ({}),
    useState(initial) { const i = state.length; state.push(typeof initial === 'function' ? initial() : initial); return [state[i], value => { state[i] = value; }]; },
    useEffect(fn) { effects.push(fn); },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    window: { location, history: { state: null, replaceState(_s, _title, url) { location.href = String(url); } } },
  };
  vm.createContext(sandbox);
  const api = vm.runInContext(source + '\nHomeTab({amount:null,daysUntil:null})', sandbox);
  return { state, effects, timers, location, api };
}
(async () => {
  let h = harness(async () => { throw new Error('offline'); });
  await h.api.unlockPro();
  assert.match(h.state[4], /unavailable/);
  assert.equal(h.state[3], false, 'failed checkout must re-enable retry');
  h = harness(async () => ({ ok: false, json: async () => ({ error: 'failure' }) }));
  await h.api.unlockPro();
  assert.match(h.state[4], /unavailable/);
  assert.equal(h.location.href, 'https://talli.heyitsmejosh.com/app');
  let calls = 0;
  h = harness(async () => ({ ok: true, json: async () => ({ isPro: ++calls > 1 }) }), true);
  h.effects[1](); await tick();
  assert.equal(h.state[5], true, 'do not offer another purchase while awaiting the webhook');
  assert.equal(h.timers.length, 1);
  await h.timers.shift()();
  assert.equal(h.state[2], true);
  assert.equal(h.state[5], false);
  assert.equal(h.location.href, 'https://talli.heyitsmejosh.com/app');
  h = harness(async () => ({ ok: true, json: async () => ({ isPro: false }) }), true);
  h.effects[1](); await tick();
  while (h.timers.length) await h.timers.shift()();
  assert.match(h.state[4], /do not pay again/);
  assert.equal(h.state[5], true);
  console.log('test-checkout-ui: 4 checkout scenarios passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
