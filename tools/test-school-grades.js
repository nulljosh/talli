const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadSchoolGrades } = require('../src/school-grades');

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

(function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tally-school-grades-'));
  const freshPath = path.join(tmpDir, 'fresh.json');
  const stalePath = path.join(tmpDir, 'stale.json');
  const invalidJsonPath = path.join(tmpDir, 'invalid.json');

  writeJson(freshPath, {
    retrieved_at: new Date().toISOString(),
    courses: []
  });

  writeJson(stalePath, {
    retrieved_at: new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)).toISOString(),
    courses: []
  });

  fs.writeFileSync(invalidJsonPath, '{ not valid json ');

  process.env.SCHOOL_GRADES_STALE_HOURS = '24';

  const fresh = loadSchoolGrades(freshPath);
  assert.strictEqual(typeof fresh.meta.lastUpdated, 'string');
  assert.strictEqual(fresh.meta.stale, false);
  assert.strictEqual(fresh.meta.staleAfterHours, 24);

  const stale = loadSchoolGrades(stalePath);
  assert.strictEqual(stale.meta.stale, true);
  assert(stale.meta.ageHours > 24);

  assert.throws(
    () => loadSchoolGrades(path.join(tmpDir, 'missing.json')),
    /not found/
  );

  assert.throws(
    () => loadSchoolGrades(invalidJsonPath),
    /Invalid JSON/
  );

  console.log('school-grades tests passed');
})();
