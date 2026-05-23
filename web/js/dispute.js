// Dispute wizard state + rendering

let disputeStep = 1;
const disputeData = {
  decision: '',
  description: '',
  decisionDate: '',
  internalReview: ''
};

function renderDisputeWizard() {
  const container = document.getElementById('dispute-wizard');
  if (!container) return;

  // Clear any previous form error
  const existingError = container.querySelector('.form-error');
  if (existingError) existingError.style.display = 'none';

  if (disputeStep === 1) {
    container.innerHTML = `
      <div class="wizard-step">Step 1 of 5</div>
      <div class="form-group">
        <label for="dispute-decision">What decision are you disputing?</label>
        <select id="dispute-decision">
          <option value="">Select one...</option>
          <option value="Income Assistance amount" ${disputeData.decision === 'Income Assistance amount' ? 'selected' : ''}>Income Assistance amount</option>
          <option value="PWD application denial" ${disputeData.decision === 'PWD application denial' ? 'selected' : ''}>PWD application denial</option>
          <option value="Monthly report rejection" ${disputeData.decision === 'Monthly report rejection' ? 'selected' : ''}>Monthly report rejection</option>
          <option value="Service request denial" ${disputeData.decision === 'Service request denial' ? 'selected' : ''}>Service request denial</option>
          <option value="Other" ${disputeData.decision === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-error" id="dispute-error-1"></div>
      <button class="btn" onclick="nextDisputeStep()">Next</button>
    `;
    return;
  }

  if (disputeStep === 2) {
    const safeDescription = escapeHtml(disputeData.description || '');
    container.innerHTML = `
      <div class="wizard-step">Step 2 of 5</div>
      <div class="form-group">
        <label for="dispute-description">Brief description of the issue</label>
        <textarea id="dispute-description" maxlength="500" oninput="updateDisputeCounter()" placeholder="Include what happened and what you want reviewed.">${safeDescription}</textarea>
        <div id="dispute-counter" class="char-counter">${(disputeData.description || '').length}/500</div>
      </div>
      <div class="form-error" id="dispute-error-2"></div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="prevDisputeStep()">Back</button>
        <button class="btn" onclick="nextDisputeStep()">Next</button>
      </div>
    `;
    return;
  }

  if (disputeStep === 3) {
    container.innerHTML = `
      <div class="wizard-step">Step 3 of 5</div>
      <div class="form-group">
        <label for="dispute-date">When did you receive the decision?</label>
        <input type="date" id="dispute-date" value="${disputeData.decisionDate || ''}">
      </div>
      <div class="form-error" id="dispute-error-3"></div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="prevDisputeStep()">Back</button>
        <button class="btn" onclick="nextDisputeStep()">Next</button>
      </div>
    `;
    return;
  }

  if (disputeStep === 4) {
    container.innerHTML = `
      <div class="wizard-step">Step 4 of 5</div>
      <div class="form-group">
        <label>Have you already requested an internal review?</label>
        <div class="radio-row">
          <label class="radio-pill">
            <input type="radio" name="internal-review" value="yes" ${disputeData.internalReview === 'yes' ? 'checked' : ''}>
            Yes
          </label>
          <label class="radio-pill">
            <input type="radio" name="internal-review" value="no" ${disputeData.internalReview === 'no' ? 'checked' : ''}>
            No
          </label>
        </div>
      </div>
      <div class="form-error" id="dispute-error-4"></div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="prevDisputeStep()">Back</button>
        <button class="btn" onclick="nextDisputeStep()">View Results</button>
      </div>
    `;
    return;
  }

  const needsReview = disputeData.internalReview === 'no';
  const issueLabel = disputeData.decision ? escapeHtml(disputeData.decision) : 'your decision';
  container.innerHTML = `
    <div class="wizard-step">Step 5 of 5</div>
    <div class="dispute-summary-box">
      <div class="dispute-summary-label">Dispute Type</div>
      <div class="dispute-summary-value">${issueLabel}</div>
    </div>
    ${needsReview ? `
    <div class="dispute-warning-box">
      You must request an internal review first. Contact your worker within 20 business days.
    </div>` : ''}
    <div class="dispute-info-box">
      You have 20 business days from receiving the decision to request a reconsideration.
    </div>
    <div style="margin-bottom: 14px;">
      <div class="dispute-section-title">Escalation Path</div>
      <div class="dispute-escalation-text">Internal Review -> Reconsideration -> Employment and Assistance Appeal Tribunal -> BC Ombudsperson</div>
    </div>
    <div class="resource-links" style="margin-bottom: 14px;">
      <div class="dispute-section-title">Resources</div>
      <a href="https://bcombudsperson.ca" target="_blank" rel="noopener noreferrer">BC Ombudsperson</a>
      <a href="https://lss.bc.ca" target="_blank" rel="noopener noreferrer">BC Legal Aid</a>
      <a href="https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies" target="_blank" rel="noopener noreferrer">Residential Tenancy Branch (RTB)</a>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-secondary" onclick="prevDisputeStep()">Back</button>
      <button class="btn" onclick="resetDisputeFlow()">Start Over</button>
    </div>
  `;
}

function showDisputeError(step, message) {
  const el = document.getElementById('dispute-error-' + step);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function updateDisputeCounter() {
  const input = document.getElementById('dispute-description');
  const counter = document.getElementById('dispute-counter');
  if (!input || !counter) return;
  counter.textContent = `${input.value.length}/500`;
}

function nextDisputeStep() {
  if (disputeStep === 1) {
    const decision = document.getElementById('dispute-decision').value;
    if (!decision) {
      showDisputeError(1, 'Select a decision to continue.');
      return;
    }
    disputeData.decision = decision;
  } else if (disputeStep === 2) {
    const description = document.getElementById('dispute-description').value.trim();
    if (!description) {
      showDisputeError(2, 'Add a brief description to continue.');
      return;
    }
    disputeData.description = description;
  } else if (disputeStep === 3) {
    const decisionDate = document.getElementById('dispute-date').value;
    if (!decisionDate) {
      showDisputeError(3, 'Select the date you received the decision.');
      return;
    }
    disputeData.decisionDate = decisionDate;
  } else if (disputeStep === 4) {
    const selected = document.querySelector('input[name="internal-review"]:checked');
    if (!selected) {
      showDisputeError(4, 'Select yes or no to continue.');
      return;
    }
    disputeData.internalReview = selected.value;
  }

  disputeStep = Math.min(5, disputeStep + 1);
  renderDisputeWizard();
}

function prevDisputeStep() {
  disputeStep = Math.max(1, disputeStep - 1);
  renderDisputeWizard();
}

function resetDisputeFlow() {
  disputeStep = 1;
  disputeData.decision = '';
  disputeData.description = '';
  disputeData.decisionDate = '';
  disputeData.internalReview = '';
  renderDisputeWizard();
}
