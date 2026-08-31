// The /app -> /login.html -> /app infinite redirect loop: the dashboard bounced
// to login on ANY failure, and login auto-resumed to /app because the server
// session was still valid. Guard both ends.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const unified = fs.readFileSync(path.join(__dirname, '../web/unified.html'), 'utf8');
const login = fs.readFileSync(path.join(__dirname, '../web/login.html'), 'utf8');

// Dashboard: no bare navigation to login; every bounce goes through the one-shot guard.
// _talliBounceToLogin owns the only real navigation (2-space indent, top level)
const bareBounces = unified
  .split('\n')
  .filter(l => /location\.href\s*=\s*'\/login\.html'/.test(l) && !/logout/.test(l))
  .filter(l => l !== "  location.href = '/login.html';");
assert.deepStrictEqual(bareBounces, [], `unguarded bounce to login: ${bareBounces.join(' | ')}`);
assert.ok(/function _talliBounceToLogin/.test(unified), 'missing one-shot bounce guard');
assert.ok(/sessionStorage\.setItem\('talliBounced'/.test(unified), 'guard never sets its marker');

// Login: must not auto-resume into /app when the dashboard just bounced us here.
const resume = login.indexOf("session-check");
const guard = login.indexOf("sessionStorage.getItem('talliBounced')");
assert.ok(guard !== -1 && guard < resume, 'login auto-resume is not gated on the bounce marker');

// Simulate the loop with the real guard semantics.
const store = {};
const sessionStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
let navigations = 0;
function bounce() { // mirrors _talliBounceToLogin
  if (sessionStorage.getItem('talliBounced')) return false;
  sessionStorage.setItem('talliBounced', '1');
  navigations++;
  return true;
}
function loginPageAutoResume() { // mirrors login.html
  return !sessionStorage.getItem('talliBounced');
}
for (let i = 0; i < 50; i++) { if (bounce()) loginPageAutoResume(); }
assert.strictEqual(navigations, 1, 'bounce must happen at most once per tab');
assert.strictEqual(loginPageAutoResume(), false, 'login must stop auto-resuming after a bounce');

console.log('test-login-loop: ok');
