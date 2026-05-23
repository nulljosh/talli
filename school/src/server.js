require('dotenv').config();

const express = require('express');
const path = require('path');
const { loadSchoolGrades } = require('./school-grades');

const app = express();
const PORT = process.env.PORT || 3000;

// -- Grade helpers --

function letterFromGrade(pct) {
  if (pct >= 93) return 'A+';
  if (pct >= 86) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 76) return 'B+';
  if (pct >= 73) return 'B';
  if (pct >= 70) return 'B-';
  if (pct >= 67) return 'C+';
  if (pct >= 63) return 'C';
  if (pct >= 60) return 'C-';
  if (pct >= 50) return 'D';
  return 'F';
}

function gpaFromPct(pct) {
  if (pct >= 93) return 4.33;
  if (pct >= 86) return 4.0;
  if (pct >= 80) return 3.67;
  if (pct >= 76) return 3.33;
  if (pct >= 73) return 3.0;
  if (pct >= 70) return 2.67;
  if (pct >= 67) return 2.33;
  if (pct >= 63) return 2.0;
  if (pct >= 60) return 1.67;
  if (pct >= 50) return 1.0;
  return 0.0;
}

// -- Routes --

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/school.html'));
});

app.get('/precalc.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/precalc.html'));
});

app.get('/api/grades', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const payload = loadSchoolGrades();
    res.json(payload);
  } catch (error) {
    const message = String(error?.message || 'Unknown error');
    const statusCode = message.includes('not found') ? 404 : 503;
    res.status(statusCode).json({
      error: 'School grades unavailable. Run `npm run refresh` locally to generate data/grades.json.',
      details: message
    });
  }
});

app.get('/api/quizzes', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const quizPath = path.join(__dirname, '../data/quizzes.json');
    const fs = require('fs');
    if (!fs.existsSync(quizPath)) {
      return res.status(404).json({ error: 'Quiz data not generated yet. Run: python3 tools/generate_quizzes.py' });
    }
    const data = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error?.message || 'Unknown error') });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`School server running on http://localhost:${PORT}`);
});
