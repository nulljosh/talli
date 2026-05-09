require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { loadSchoolGrades } = require('./school-grades');

const app = express();
const PORT = process.env.PORT || 3000;

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
    const data = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    res.json(data);
  } catch (error) {
    const code = error?.code === 'ENOENT' ? 404 : 500;
    const msg = error?.code === 'ENOENT'
      ? 'Quiz data not generated yet. Run: python3 tools/generate_quizzes.py'
      : String(error?.message || 'Unknown error');
    res.status(code).json({ error: msg });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`School server running on http://localhost:${PORT}`);
});
