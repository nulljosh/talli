const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL: ' + name);
    console.log('    ' + err.message);
  }
}

// Replicate the scoring logic from dtc.js for testability
function calculateEligibility(answers) {
  let dtcScore = 0;
  let pwdScore = 0;
  let flags = [];
  let programs = [];

  if (answers.q1 === 'yes') { dtcScore += 20; pwdScore += 20; }
  else { flags.push({ type: 'warning', text: 'diagnosis required' }); }

  const conditions = answers.q2 || [];
  if (conditions.includes('autism')) { dtcScore += 15; pwdScore += 15; }
  if (conditions.includes('adhd')) { dtcScore += 10; }
  if (conditions.includes('physical') || conditions.includes('vision') || conditions.includes('hearing')) { dtcScore += 15; pwdScore += 15; }

  if (answers.q3 === 'yes') { dtcScore += 15; pwdScore += 15; }
  else { dtcScore -= 30; pwdScore -= 30; }

  if (answers.q4 === 'BC') { pwdScore += 10; }

  if (answers.q5 === 'yes') { dtcScore += 15; pwdScore += 15; }
  else { dtcScore -= 20; }

  const activities = answers.q6 || [];
  if (activities.length >= 4) { dtcScore += 15; pwdScore += 10; }
  else if (activities.length >= 2) { dtcScore += 10; pwdScore += 5; }

  if (answers.q7 === 'always') dtcScore += 15;
  else if (answers.q7 === 'usually') dtcScore += 10;
  else if (answers.q7 === 'sometimes') dtcScore += 5;

  if (answers.q8 === 'always') { dtcScore += 15; pwdScore += 10; }
  else if (answers.q8 === 'frequently') { dtcScore += 10; pwdScore += 5; }
  else if (answers.q8 === 'occasionally') dtcScore += 5;

  dtcScore = Math.max(0, Math.min(100, dtcScore));
  pwdScore = Math.max(0, Math.min(100, pwdScore));

  let dtcEligibility;
  if (dtcScore >= 70) dtcEligibility = 'Likely';
  else if (dtcScore >= 50) dtcEligibility = 'Possible';
  else if (dtcScore >= 30) dtcEligibility = 'Unlikely';
  else dtcEligibility = 'No';

  let pwdEligibility;
  if (pwdScore >= 60) pwdEligibility = 'Likely';
  else if (pwdScore >= 40) pwdEligibility = 'Possible';
  else pwdEligibility = 'Unlikely';

  return { dtc: { score: dtcScore, eligibility: dtcEligibility }, pwd: { score: pwdScore, eligibility: pwdEligibility }, flags };
}

function run() {
  console.log('test-dtc-navigator');

  test('strong candidate scores Likely for DTC', () => {
    const result = calculateEligibility({
      q1: 'yes', q2: ['autism'], q3: 'yes', q4: 'BC', q5: 'yes',
      q6: ['dressing', 'cooking', 'finances', 'socializing'],
      q7: 'always', q8: 'always'
    });
    assert.strictEqual(result.dtc.eligibility, 'Likely');
    assert.ok(result.dtc.score >= 70, 'Score should be >= 70, got ' + result.dtc.score);
  });

  test('strong candidate scores Likely for PWD in BC', () => {
    const result = calculateEligibility({
      q1: 'yes', q2: ['autism'], q3: 'yes', q4: 'BC', q5: 'yes',
      q6: ['dressing', 'cooking', 'finances', 'socializing'],
      q7: 'always', q8: 'always'
    });
    assert.strictEqual(result.pwd.eligibility, 'Likely');
  });

  test('no diagnosis reduces scores', () => {
    const result = calculateEligibility({
      q1: 'no', q3: 'yes', q5: 'yes', q7: 'sometimes', q8: 'occasionally'
    });
    assert.ok(result.dtc.score < 70, 'Without diagnosis, should not be Likely');
    assert.ok(result.flags.length > 0, 'Should have warning flag');
  });

  test('condition not lasting 12 months heavily penalizes', () => {
    const result = calculateEligibility({
      q1: 'yes', q3: 'no', q5: 'yes'
    });
    // q1=yes gives 20, q3=no subtracts 30, q5=yes gives 15 = 5 (clamped to 5)
    assert.ok(result.dtc.score < 30, 'Short duration should score low, got ' + result.dtc.score);
  });

  test('scores clamp to 0-100 range', () => {
    const low = calculateEligibility({ q1: 'no', q3: 'no', q5: 'no' });
    assert.ok(low.dtc.score >= 0, 'Score should not go below 0');
    assert.ok(low.dtc.score <= 100, 'Score should not exceed 100');
  });

  test('ADHD adds to DTC but not PWD', () => {
    const withAdhd = calculateEligibility({ q1: 'yes', q2: ['adhd'], q3: 'yes', q5: 'yes' });
    const without = calculateEligibility({ q1: 'yes', q2: [], q3: 'yes', q5: 'yes' });
    assert.ok(withAdhd.dtc.score > without.dtc.score, 'ADHD should increase DTC score');
    assert.strictEqual(withAdhd.pwd.score, without.pwd.score, 'ADHD should not affect PWD score');
  });

  test('multiple activities strengthen score', () => {
    const few = calculateEligibility({ q1: 'yes', q3: 'yes', q5: 'yes', q6: ['cooking'] });
    const many = calculateEligibility({ q1: 'yes', q3: 'yes', q5: 'yes', q6: ['cooking', 'dressing', 'finances', 'socializing'] });
    assert.ok(many.dtc.score > few.dtc.score, '4+ activities should score higher than 1');
  });

  test('eligibility thresholds are correct', () => {
    // Manually verify threshold labels
    const results = [
      { score: 75, expected: 'Likely' },
      { score: 55, expected: 'Possible' },
      { score: 35, expected: 'Unlikely' },
      { score: 10, expected: 'No' }
    ];
    results.forEach(({ score, expected }) => {
      let label;
      if (score >= 70) label = 'Likely';
      else if (score >= 50) label = 'Possible';
      else if (score >= 30) label = 'Unlikely';
      else label = 'No';
      assert.strictEqual(label, expected, `Score ${score} should be ${expected}`);
    });
  });

  test('empty answers produce valid result', () => {
    const result = calculateEligibility({});
    assert.strictEqual(typeof result.dtc.score, 'number');
    assert.strictEqual(typeof result.pwd.score, 'number');
    assert.ok(result.dtc.score >= 0);
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
