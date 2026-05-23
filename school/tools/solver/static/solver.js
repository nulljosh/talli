const root = document.documentElement;
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const statusText = document.getElementById('statusText');
const result = document.getElementById('result');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('previewImage');
const dropHint = document.getElementById('dropHint');
const actions = document.getElementById('actions');
const clearButton = document.getElementById('clearButton');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');
const allowedTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
]);
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
let previewUrl = '';
let activeController = null;

function getStoredTheme() {
  return localStorage.getItem('solver-theme');
}

function getEffectiveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return mediaQuery.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const effectiveTheme = getEffectiveTheme(theme);
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
  themeIcon.textContent = effectiveTheme === 'dark' ? 'Moon' : 'Sun';
  themeLabel.textContent = theme === 'light' || theme === 'dark' ? theme[0].toUpperCase() + theme.slice(1) : 'Auto';
}

function cycleTheme() {
  const current = getStoredTheme() || 'auto';
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  if (next === 'auto') {
    localStorage.removeItem('solver-theme');
  } else {
    localStorage.setItem('solver-theme', next);
  }
  applyTheme(next);
}

applyTheme(getStoredTheme() || 'auto');
if (typeof mediaQuery.addEventListener === 'function') {
  mediaQuery.addEventListener('change', () => {
    if (!getStoredTheme()) applyTheme('auto');
  });
} else if (typeof mediaQuery.addListener === 'function') {
  mediaQuery.addListener(() => {
    if (!getStoredTheme()) applyTheme('auto');
  });
}

themeToggle.addEventListener('click', cycleTheme);

function setLoading(isLoading, message = 'Processing image...') {
  statusText.textContent = message;
  status.classList.toggle('visible', isLoading);
  dropzone.style.pointerEvents = isLoading ? 'none' : 'auto';
}

function showResult(html, isError = false) {
  result.innerHTML = html;
  result.classList.add('visible');
  result.classList.toggle('error', isError);
  actions.classList.add('visible');
}

function appendResult(html) {
  if (!result.classList.contains('visible')) {
    result.classList.add('visible');
  }
  result.classList.remove('error');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const node = wrapper.firstElementChild;
  if (!node) return;
  node.style.animation = 'fadeInUp 0.45s ease forwards';
  result.appendChild(node);
  actions.classList.add('visible');
}

function clearPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  previewImage.removeAttribute('src');
  preview.classList.remove('visible');
  dropHint.textContent = 'No image selected yet.';
}

function setPreview(file) {
  clearPreview();
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  preview.classList.add('visible');
  dropHint.textContent = file.name || 'Pasted image ready to upload.';
}

function resetState() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  setLoading(false);
  result.innerHTML = '';
  result.classList.remove('visible', 'error');
  actions.classList.remove('visible');
  fileInput.value = '';
  clearPreview();
}

function isImageFile(file) {
  if (!file) return false;
  if (allowedTypes.has(file.type)) return true;
  const name = file.name ? file.name.toLowerCase() : '';
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some(ext => name.endsWith(ext));
}

async function uploadFile(file) {
  if (!isImageFile(file)) {
    showResult('<p>Please upload an image file: png, jpg, jpeg, webp, or gif.</p>', true);
    return;
  }

  setPreview(file);

  const formData = new FormData();
  formData.append('image', file, file.name || 'upload.png');

  setLoading(true);
  result.classList.remove('visible');
  result.classList.remove('error');
  result.innerHTML = '';
  actions.classList.remove('visible');
  statusText.textContent = 'Processing image...';

  try {
    const controller = new AbortController();
    activeController = controller;
    const response = await fetch('/solve', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Request failed');
    }
    if (!response.body) {
      throw new Error('Streaming not supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = 0;
    let doneReceived = false;

    const handleEvent = (rawEvent) => {
      const lines = rawEvent.split('\n');
      let eventName = 'message';
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      const payload = dataLines.join('\n');
      if (!payload) return;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch (error) {
        throw new Error('Invalid stream response.');
      }

      if (eventName === 'result') {
        completed += 1;
        appendResult(parsed.html || '<p>No response returned.</p>');
        statusText.textContent = `Processing image... ${completed}/3`;
        return;
      }

      if (eventName === 'error') {
        throw new Error(parsed.error || 'Request failed');
      }

      if (eventName === 'done') {
        doneReceived = true;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventText of events) {
        if (eventText.trim()) {
          handleEvent(eventText);
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      handleEvent(buffer);
    }

    if (!doneReceived && completed === 0) {
      throw new Error('No response returned.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      showResult(`<p>${escapeHtml(error.message || 'Something went wrong.')}</p>`, true);
    }
  } finally {
    activeController = null;
    setLoading(false);
    fileInput.value = '';
  }
}

function handleFiles(files) {
  if (files && files[0]) {
    uploadFile(files[0]);
  }
}

dropzone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dropzone.classList.add('active');
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('active');
});

dropzone.addEventListener('dragleave', (event) => {
  if (!dropzone.contains(event.relatedTarget)) {
    dropzone.classList.remove('active');
  }
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('active');
  handleFiles(event.dataTransfer.files);
});

fileInput.addEventListener('change', (event) => {
  handleFiles(event.target.files);
});

clearButton.addEventListener('click', () => {
  resetState();
});

window.addEventListener('paste', (event) => {
  const items = event.clipboardData ? event.clipboardData.items : [];
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        uploadFile(file);
        return;
      }
    }
  }
});

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
