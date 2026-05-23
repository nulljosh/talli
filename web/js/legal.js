// Legal issue analysis

async function analyzeLegalIssue() {
  const descriptionEl = document.getElementById('legal-description');
  const resultEl = document.getElementById('legal-analysis-results');
  const buttonEl = document.getElementById('legal-analyze-btn');
  const description = descriptionEl ? descriptionEl.value.trim() : '';

  if (!description) {
    resultEl.innerHTML = '<div style="color: var(--error); font-size: 13px;">Please enter a description first.</div>';
    return;
  }

  buttonEl.disabled = true;
  buttonEl.textContent = 'Analyzing...';
  resultEl.innerHTML = '<div class="loading" style="padding: 10px 0;">Analyzing your issue...</div>';

  try {
    const response = await fetch('/api/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ description })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed');

    const categories = Array.isArray(data.categories) ? data.categories : [];
    const steps = Array.isArray(data.nextSteps) ? data.nextSteps : [];
    const resources = Array.isArray(data.resources) ? data.resources : [];

    let html = '<div style="margin-bottom: 14px;"><strong>Matched Categories</strong></div>';
    if (categories.length === 0) {
      html += '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">No clear category match found. Try adding more details.</div>';
    } else {
      html += categories.map(cat => `
        <div class="list-item">
          <div class="list-item-title">${escapeHtml(cat.name)} <span class="analysis-pill">${Math.round((Number(cat.confidence) || 0) * 100)}%</span></div>
          <div class="list-item-meta">${escapeHtml(cat.description || '')}</div>
        </div>
      `).join('');
    }

    html += '<div style="margin: 14px 0 8px;"><strong>Next Steps</strong></div>';
    html += steps.length > 0
      ? '<ol style="padding-left: 18px; font-size: 13px; line-height: 1.6;">' + steps.map(step => `<li>${escapeHtml(step)}</li>`).join('') + '</ol>'
      : '<div style="font-size: 13px; color: var(--text-secondary);">No specific next steps generated.</div>';

    html += '<div style="margin: 14px 0 8px;"><strong>Resources</strong></div>';
    html += resources.length > 0
      ? '<div class="resource-links">' + resources.map(resource => `
          <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.name)}</a>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: -6px; margin-bottom: 8px;">${escapeHtml(resource.description || '')}</div>
        `).join('') + '</div>'
      : '<div style="font-size: 13px; color: var(--text-secondary);">No resources matched.</div>';

    resultEl.innerHTML = html;
  } catch (err) {
    resultEl.innerHTML = `<div style="color: var(--error); font-size: 13px;">${escapeHtml(err.message || 'Failed to analyze issue.')}</div>`;
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = 'Analyze Issue';
  }
}
