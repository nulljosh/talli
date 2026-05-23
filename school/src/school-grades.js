const fs = require('fs');
const path = require('path');

const SCHOOL_GRADES_PATH = path.join(__dirname, '../data/grades.json');
const DEFAULT_STALE_HOURS = 72;

function getStaleAfterHours() {
  const raw = Number(process.env.SCHOOL_GRADES_STALE_HOURS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_STALE_HOURS;
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readGradesJson(filePath) {
  let body;
  try {
    body = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`School grades file not found: ${filePath}`);
    }
    throw new Error(`Unable to read school grades file: ${error.message}`);
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON in school grades file: ${error.message}`);
  }
}

function loadSchoolGrades(filePath = SCHOOL_GRADES_PATH) {
  const parsed = readGradesJson(filePath);

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.courses)) {
    throw new Error('Invalid school grades format: expected courses[]');
  }

  const lastUpdatedIso = toIso(parsed.retrieved_at);
  const staleAfterHours = getStaleAfterHours();
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

  let ageMs = null;
  if (lastUpdatedIso) {
    ageMs = Math.max(0, Date.now() - new Date(lastUpdatedIso).getTime());
  }

  const isStale = ageMs === null || ageMs > staleAfterMs;

  return {
    grades: parsed,
    meta: {
      lastUpdated: lastUpdatedIso,
      stale: isStale,
      ageHours: ageMs === null ? null : Math.round((ageMs / (60 * 60 * 1000)) * 10) / 10,
      staleAfterHours,
      source: path.relative(path.join(__dirname, '..'), filePath)
    }
  };
}

module.exports = {
  SCHOOL_GRADES_PATH,
  loadSchoolGrades
};
