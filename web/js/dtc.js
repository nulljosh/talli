// DTC Navigator - Eligibility Screener

let dtcQuestions = [];
let currentQuestionIndex = 0;
let dtcAnswers = {};

const sectionTitles = {
  basics: 'Basic Information',
  impact: 'Impact on Daily Living',
  taxes: 'Tax History',
  existing: 'Existing Benefits'
};

async function loadDTCQuestions() {
  try {
    const response = await fetch('/data/dtc-knowledge.json');
    const data = await response.json();
    dtcQuestions = data.screenerQuestions;
  } catch (err) {
    console.error('Error loading DTC questions:', err);
    dtcQuestions = [
      { id: 'q1', section: 'basics', question: 'Do you have a diagnosed medical condition or disability?', type: 'yesno', required: true, helpText: 'This includes physical disabilities, mental health conditions, neurodevelopmental conditions (autism, ADHD), chronic illnesses, etc.' },
      { id: 'q3', section: 'basics', question: 'Has your condition lasted (or is expected to last) at least 12 months?', type: 'yesno', required: true },
      { id: 'q5', section: 'impact', question: 'Does your condition significantly affect your ability to perform daily activities?', type: 'yesno', required: true }
    ];
  }
}

function startScreener() {
  document.getElementById('dtc-intro').style.display = 'none';
  document.getElementById('dtc-screener').style.display = 'block';
  document.getElementById('dtc-results').style.display = 'none';
  currentQuestionIndex = 0;
  dtcAnswers = {};
  renderQuestion();
}

function resetScreener() {
  document.getElementById('dtc-intro').style.display = 'block';
  document.getElementById('dtc-screener').style.display = 'none';
  document.getElementById('dtc-results').style.display = 'none';
  currentQuestionIndex = 0;
  dtcAnswers = {};
}

function renderQuestion() {
  const q = dtcQuestions[currentQuestionIndex];
  const container = document.getElementById('dtc-question-container');
  const progress = ((currentQuestionIndex + 1) / dtcQuestions.length * 100).toFixed(0);

  document.getElementById('dtc-section-title').textContent = sectionTitles[q.section] || q.section;
  document.getElementById('dtc-progress-badge').textContent = `${currentQuestionIndex + 1} / ${dtcQuestions.length}`;
  document.getElementById('dtc-progress-bar').style.width = progress + '%';
  document.getElementById('dtc-progress-bar').textContent = progress + '%';

  document.getElementById('dtc-back-btn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';

  const nextBtn = document.getElementById('dtc-next-btn');
  nextBtn.textContent = currentQuestionIndex === dtcQuestions.length - 1 ? 'Get Results' : 'Next';

  let html = `<div style="margin-bottom: 16px;">
    <p style="font-size: 16px; font-weight: 500; margin-bottom: 8px; line-height: 1.5;">${q.question}</p>
    ${q.helpText ? `<p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">${q.helpText}</p>` : ''}
  </div>`;

  const savedAnswer = dtcAnswers[q.id];

  if (q.type === 'yesno') {
    html += `<div style="display: flex; gap: 12px;">
      <button class="btn ${savedAnswer === 'yes' ? '' : 'btn-secondary'}" onclick="selectAnswer('${q.id}', 'yes')" style="flex: 1; padding: 16px;" id="opt-yes">Yes</button>
      <button class="btn ${savedAnswer === 'no' ? '' : 'btn-secondary'}" onclick="selectAnswer('${q.id}', 'no')" style="flex: 1; padding: 16px;" id="opt-no">No</button>
    </div>`;
  } else if (q.type === 'select') {
    html += `<select onchange="selectAnswer('${q.id}', this.value)" style="padding: 14px;">
      <option value="">Select one...</option>
      ${q.options.map(opt => `<option value="${opt.value}" ${savedAnswer === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
    </select>`;
  } else if (q.type === 'multiselect') {
    const savedArr = Array.isArray(savedAnswer) ? savedAnswer : [];
    html += `<div style="display: flex; flex-direction: column; gap: 8px;">
      ${q.options.map(opt => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border); cursor: pointer; font-size: 14px; margin-bottom: 0;">
          <input type="checkbox" value="${opt.value}" ${savedArr.includes(opt.value) ? 'checked' : ''} onchange="updateMultiSelect('${q.id}')" style="width: auto; margin: 0;">
          ${opt.label}
        </label>
      `).join('')}
    </div>`;
  }

  container.innerHTML = html;
}

function selectAnswer(questionId, value) {
  dtcAnswers[questionId] = value;
  const q = dtcQuestions[currentQuestionIndex];
  if (q.type === 'yesno') {
    const yesBtn = document.getElementById('opt-yes');
    const noBtn = document.getElementById('opt-no');
    if (value === 'yes') {
      yesBtn.className = 'btn';
      noBtn.className = 'btn btn-secondary';
    } else {
      yesBtn.className = 'btn btn-secondary';
      noBtn.className = 'btn';
    }
  }
}

function updateMultiSelect(questionId) {
  const checkboxes = document.querySelectorAll(`#dtc-question-container input[type="checkbox"]`);
  const selected = [];
  checkboxes.forEach(cb => { if (cb.checked) selected.push(cb.value); });
  dtcAnswers[questionId] = selected;
}

function nextQuestion() {
  const q = dtcQuestions[currentQuestionIndex];
  const answer = dtcAnswers[q.id];

  if (q.required) {
    if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
      const container = document.getElementById('dtc-question-container');
      container.style.outline = '2px solid var(--error)';
      container.style.borderRadius = '8px';
      setTimeout(() => { container.style.outline = 'none'; }, 1000);
      return;
    }
  }

  if (currentQuestionIndex < dtcQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    submitScreener();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

async function submitScreener() {
  document.getElementById('dtc-screener').style.display = 'none';

  try {
    const response = await fetch('/api/dtc/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: dtcAnswers })
    });

    const results = await response.json();
    displayResults(results);
  } catch (err) {
    console.error('Error submitting screener:', err);
    const results = calculateEligibility(dtcAnswers);
    displayResults(results);
  }
}

function calculateEligibility(answers) {
  let dtcScore = 0;
  let pwdScore = 0;
  let flags = [];
  let programs = [];

  if (answers.q1 === 'yes') {
    dtcScore += 20;
    pwdScore += 20;
  } else {
    flags.push({ type: 'warning', text: 'A formal diagnosis is typically required. Consider getting assessed by a qualified professional.' });
  }

  const conditions = answers.q2 || [];
  if (conditions.includes('autism')) {
    dtcScore += 15;
    pwdScore += 15;
    flags.push({ type: 'info', text: 'Autism is one of the most commonly approved conditions for DTC under "Mental Functions." Late diagnosis does not affect eligibility.' });
  }
  if (conditions.includes('adhd')) {
    dtcScore += 10;
    flags.push({ type: 'info', text: 'ADHD can qualify for DTC, especially when combined with other conditions or when it significantly impacts daily functioning.' });
  }
  if (conditions.includes('physical') || conditions.includes('vision') || conditions.includes('hearing')) {
    dtcScore += 15;
    pwdScore += 15;
  }

  if (answers.q3 === 'yes') {
    dtcScore += 15;
    pwdScore += 15;
  } else {
    dtcScore -= 30;
    pwdScore -= 30;
    flags.push({ type: 'warning', text: 'The DTC requires your impairment to have lasted at least 12 continuous months.' });
  }

  if (answers.q4 === 'BC') {
    pwdScore += 10;
    programs.push({
      name: 'BC PWD Designation',
      description: 'Higher monthly assistance ($1,358.50/mo), extended health benefits, bus pass program.',
      eligible: pwdScore > 30
    });
  }

  if (answers.q5 === 'yes') {
    dtcScore += 15;
    pwdScore += 15;
  } else {
    dtcScore -= 20;
  }

  const activities = answers.q6 || [];
  if (activities.length >= 4) {
    dtcScore += 15;
    pwdScore += 10;
    flags.push({ type: 'success', text: `You identified ${activities.length} affected daily activities. Multiple areas of impact strengthen your application.` });
  } else if (activities.length >= 2) {
    dtcScore += 10;
    pwdScore += 5;
  }

  if (activities.length >= 2 && dtcScore > 40) {
    flags.push({ type: 'info', text: 'You may qualify under "Cumulative Effect of Significant Restrictions" -- having 2+ areas affected that together equal a marked restriction.' });
  }

  if (answers.q7 === 'always') {
    dtcScore += 15;
  } else if (answers.q7 === 'usually') {
    dtcScore += 10;
  } else if (answers.q7 === 'sometimes') {
    dtcScore += 5;
  }

  if (answers.q8 === 'always') {
    dtcScore += 15;
    pwdScore += 10;
  } else if (answers.q8 === 'frequently') {
    dtcScore += 10;
    pwdScore += 5;
  } else if (answers.q8 === 'occasionally') {
    dtcScore += 5;
  }

  if (answers.q9 === 'no') {
    flags.push({ type: 'warning', text: 'You need to file tax returns to receive a DTC refund. You can still file late returns for previous years.' });
  }

  let retroYears = 0;
  if (answers.q11 === 'childhood') retroYears = 10;
  else if (answers.q11 === '10+') retroYears = 10;
  else if (answers.q11 === '5-10') retroYears = 7;
  else if (answers.q11 === '3-5') retroYears = 4;
  else if (answers.q11 === '1-3') retroYears = 2;
  else if (answers.q11 === 'recent') retroYears = 1;
  else if (answers.q11 === 'not_yet') {
    flags.push({ type: 'warning', text: 'Getting a formal diagnosis is the first step. Consider a psychologist or psychiatrist assessment.' });
  }

  const existing = answers.q12 || [];
  if (existing.includes('dtc')) {
    flags.push({ type: 'info', text: 'You already have the DTC. Make sure you are also claiming: RDSP, Child Disability Benefit (if applicable), and provincial credits.' });
  }
  if (!existing.includes('rdsp') && dtcScore > 50) {
    programs.push({
      name: 'RDSP (Registered Disability Savings Plan)',
      description: 'Government matches your savings up to $3,500/year. Up to $90,000 in lifetime grants. Requires DTC approval first.',
      eligible: true
    });
  }

  programs.unshift({
    name: 'Disability Tax Credit (T2201)',
    description: 'Federal non-refundable tax credit. Can be claimed retroactively up to 10 years.',
    eligible: dtcScore > 50
  });

  let minRefund = 0;
  let maxRefund = 0;
  if (dtcScore > 50 && answers.q10 === 'yes') {
    minRefund = Math.min(retroYears, 10) * 1500;
    maxRefund = Math.min(retroYears, 10) * 2500;
    if (answers.q11 === 'childhood' || answers.q11 === '10+') {
      maxRefund = 25000;
    }
  }

  dtcScore = Math.max(0, Math.min(100, dtcScore));
  pwdScore = Math.max(0, Math.min(100, pwdScore));

  let dtcEligibility, pwdEligibility;
  if (dtcScore >= 70) dtcEligibility = 'Likely';
  else if (dtcScore >= 50) dtcEligibility = 'Possible';
  else if (dtcScore >= 30) dtcEligibility = 'Unlikely';
  else dtcEligibility = 'No';

  if (pwdScore >= 60) pwdEligibility = 'Likely';
  else if (pwdScore >= 40) pwdEligibility = 'Possible';
  else pwdEligibility = 'Unlikely';

  return {
    dtc: {
      score: dtcScore,
      eligibility: dtcEligibility,
      estimatedRefund: { min: minRefund, max: maxRefund },
      retroYears: retroYears
    },
    pwd: {
      score: pwdScore,
      eligibility: answers.q4 === 'BC' ? pwdEligibility : 'N/A (BC only)',
      monthlyIncrease: answers.q4 === 'BC' ? '$423.50/mo' : 'N/A'
    },
    programs: programs,
    flags: flags,
    nextSteps: generateNextSteps(dtcScore, pwdScore, answers, existing)
  };
}

function generateNextSteps(dtcScore, pwdScore, answers, existing) {
  const steps = [];

  if (answers.q11 === 'not_yet') {
    steps.push({
      priority: 1,
      title: 'Get a Formal Diagnosis',
      description: 'Book an assessment with a psychologist or psychiatrist. This is the foundation for all disability benefit applications.',
      action: 'Search for diagnostic assessments in your area'
    });
  }

  if (dtcScore > 40 && !(existing || []).includes('dtc')) {
    steps.push({
      priority: 2,
      title: 'Apply for the Disability Tax Credit',
      description: 'Download Form T2201 from the CRA website. Have your diagnosing doctor complete Part B.',
      action: 'Download T2201 form'
    });
  }

  if (answers.q4 === 'BC' && pwdScore > 30 && !(existing || []).includes('pwd')) {
    steps.push({
      priority: 3,
      title: 'Apply for BC PWD Designation',
      description: 'Contact your Employment and Assistance Worker to request the PWD application package.',
      action: 'Call BC Employment and Assistance: 1-866-866-0800'
    });
  }

  if (dtcScore > 50 && !(existing || []).includes('rdsp')) {
    steps.push({
      priority: 4,
      title: 'Open an RDSP',
      description: 'Once your DTC is approved, open a Registered Disability Savings Plan. The government contributes up to $3,500/year in matching grants.',
      action: 'Contact your bank about RDSP'
    });
  }

  if (answers.q9 === 'no') {
    steps.push({
      priority: 1,
      title: 'File Your Tax Returns',
      description: 'You need filed tax returns to receive DTC refunds. You can file returns for the last 10 years.',
      action: 'File taxes through CRA My Account or a tax professional'
    });
  }

  steps.push({
    priority: 5,
    title: 'Document Your Daily Limitations',
    description: 'Write down specific examples of how your condition affects daily activities. This helps your doctor complete the T2201 accurately.',
    action: 'Start a daily impact journal'
  });

  return steps.sort((a, b) => a.priority - b.priority);
}

function displayResults(results) {
  document.getElementById('dtc-results').style.display = 'block';

  let dtcColor;
  if (results.dtc.eligibility === 'Likely') dtcColor = 'var(--success)';
  else if (results.dtc.eligibility === 'Possible') dtcColor = 'var(--warning)';
  else dtcColor = 'var(--error)';

  let pwdColor;
  if (results.pwd.eligibility === 'Likely') pwdColor = 'var(--success)';
  else if (results.pwd.eligibility === 'Possible') pwdColor = 'var(--warning)';
  else if (results.pwd.eligibility === 'N/A (BC only)') pwdColor = 'var(--text-secondary)';
  else pwdColor = 'var(--error)';

  document.getElementById('dtc-eligible-badge').innerHTML = `<span style="color: ${dtcColor}">${results.dtc.eligibility}</span>`;
  document.getElementById('pwd-eligible-badge').innerHTML = `<span style="color: ${pwdColor}">${results.pwd.eligibility}</span>`;

  if (results.dtc.estimatedRefund.max > 0) {
    document.getElementById('dtc-refund-est').textContent =
      `$${results.dtc.estimatedRefund.min.toLocaleString()}-$${results.dtc.estimatedRefund.max.toLocaleString()}`;
  } else {
    document.getElementById('dtc-refund-est').textContent = '$0';
  }

  document.getElementById('dtc-programs-count').textContent = results.programs.filter(p => p.eligible).length;

  let html = '';

  if (results.flags && results.flags.length > 0) {
    html += '<div style="margin-bottom: 20px;">';
    results.flags.forEach(flag => {
      let bgColor, borderColor;
      if (flag.type === 'success') {
        bgColor = 'rgba(52, 199, 89, 0.1)';
        borderColor = 'var(--success)';
      } else if (flag.type === 'warning') {
        bgColor = 'rgba(255, 149, 0, 0.1)';
        borderColor = 'var(--warning)';
      } else {
        bgColor = 'rgba(0, 122, 255, 0.1)';
        borderColor = 'var(--text-primary)';
      }
      html += `<div style="padding: 12px 16px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 0 8px 8px 0; margin-bottom: 8px; font-size: 13px; line-height: 1.5; color: var(--text-primary);">
        ${flag.text}
      </div>`;
    });
    html += '</div>';
  }

  html += '<h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Programs You May Qualify For</h3>';
  results.programs.forEach(prog => {
    const statusColor = prog.eligible ? 'var(--success)' : 'var(--text-secondary)';
    const statusText = prog.eligible ? 'Likely Eligible' : 'May Not Qualify';
    html += `<div class="list-item">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="list-item-title">${prog.name}</div>
        <span class="status" style="background: ${statusColor}; color: var(--bg-primary);">${statusText}</span>
      </div>
      <div class="list-item-meta">${prog.description}</div>
    </div>`;
  });

  document.getElementById('dtc-results-content').innerHTML = html;

  let stepsHtml = '';
  if (results.nextSteps && results.nextSteps.length > 0) {
    results.nextSteps.forEach((step, i) => {
      stepsHtml += `<div class="list-item">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <div style="min-width: 28px; height: 28px; background: var(--text-primary); color: var(--bg-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">${i + 1}</div>
          <div>
            <div class="list-item-title" style="font-weight: 600;">${step.title}</div>
            <div class="list-item-meta" style="margin-top: 4px;">${step.description}</div>
            ${step.action ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-primary); font-weight: 500;">${step.action}</div>` : ''}
          </div>
        </div>
      </div>`;
    });
  }

  document.getElementById('dtc-steps-content').innerHTML = stepsHtml;

  document.getElementById('dtc-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyResults() {
  const resultsEl = document.getElementById('dtc-results');
  const text = resultsEl.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Results'; }, 2000);
  });
}
