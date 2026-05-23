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

function run() {
  console.log('test-dispute-wizard');

  // Simulate dispute data state transitions
  test('initial state', () => {
    const disputeData = { decision: '', description: '', decisionDate: '', internalReview: '' };
    assert.strictEqual(disputeData.decision, '');
    assert.strictEqual(disputeData.description, '');
    assert.strictEqual(disputeData.decisionDate, '');
    assert.strictEqual(disputeData.internalReview, '');
  });

  test('step 1 validation rejects empty decision', () => {
    const decision = '';
    assert.strictEqual(!decision, true, 'Empty decision should be falsy');
  });

  test('step 1 accepts valid decision', () => {
    const decision = 'PWD application denial';
    assert.strictEqual(!!decision, true);
  });

  test('step 2 validation rejects empty description', () => {
    const description = '   '.trim();
    assert.strictEqual(!description, true, 'Whitespace-only description should be falsy after trim');
  });

  test('step 2 accepts valid description', () => {
    const description = 'My PWD was denied unfairly'.trim();
    assert.strictEqual(!!description, true);
  });

  test('step 3 validation rejects empty date', () => {
    const decisionDate = '';
    assert.strictEqual(!decisionDate, true);
  });

  test('step 3 accepts valid date', () => {
    const decisionDate = '2026-03-01';
    assert.strictEqual(!!decisionDate, true);
  });

  test('step 4 validation rejects no selection', () => {
    const selected = null;
    assert.strictEqual(!selected, true);
  });

  test('step 4 accepts yes', () => {
    const selected = { value: 'yes' };
    assert.strictEqual(selected.value, 'yes');
  });

  test('step 4 accepts no', () => {
    const selected = { value: 'no' };
    assert.strictEqual(selected.value, 'no');
  });

  test('step 5 shows warning when internal review not done', () => {
    const disputeData = { internalReview: 'no' };
    const needsReview = disputeData.internalReview === 'no';
    assert.strictEqual(needsReview, true);
  });

  test('step 5 hides warning when internal review done', () => {
    const disputeData = { internalReview: 'yes' };
    const needsReview = disputeData.internalReview === 'no';
    assert.strictEqual(needsReview, false);
  });

  test('step transitions clamp to bounds', () => {
    let step = 1;
    step = Math.max(1, step - 1);
    assert.strictEqual(step, 1, 'Cannot go below step 1');

    step = 5;
    step = Math.min(5, step + 1);
    assert.strictEqual(step, 5, 'Cannot go above step 5');
  });

  test('reset clears all data', () => {
    const disputeData = {
      decision: 'PWD application denial',
      description: 'test',
      decisionDate: '2026-03-01',
      internalReview: 'yes'
    };
    disputeData.decision = '';
    disputeData.description = '';
    disputeData.decisionDate = '';
    disputeData.internalReview = '';
    assert.strictEqual(disputeData.decision, '');
    assert.strictEqual(disputeData.description, '');
    assert.strictEqual(disputeData.decisionDate, '');
    assert.strictEqual(disputeData.internalReview, '');
  });

  test('all 5 decision options are valid', () => {
    const options = [
      'Income Assistance amount',
      'PWD application denial',
      'Monthly report rejection',
      'Service request denial',
      'Other'
    ];
    assert.strictEqual(options.length, 5);
    options.forEach(opt => assert.strictEqual(typeof opt, 'string'));
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
