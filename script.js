// Supabase Auto-Save for Circuit Assembly Program
const SUPABASE_URL = 'https://vqgratxiuwcxvelzgncl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZ3JhdHhpdXdjeHZlbHpnbmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTgwNTIsImV4cCI6MjA4NTQ5NDA1Mn0.kUYtA_0Jmx1SQZiYG090IPntfWe5sOXes_1LjzyDCKI';

let saveTimeout = null;
let sessionId = null;
let statusEl = null;

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  let sid = params.get('session');
  if (!sid) {
    sid = localStorage.getItem('assembly_session_id');
  }
  if (!sid) {
    sid = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  localStorage.setItem('assembly_session_id', sid);
  if (!params.get('session')) {
    const url = new URL(window.location);
    url.searchParams.set('session', sid);
    window.history.replaceState({}, '', url);
  }
  return sid;
}

function collectNotes() {
  const notes = {};
  document.querySelectorAll('input, textarea').forEach((el, i) => {
    const key = el.getAttribute('aria-label') || el.placeholder || 'field_' + i;
    if (el.value && el.value.trim()) {
      notes[key] = el.value;
    }
  });
  return notes;
}

function applyNotes(notes) {
  if (!notes || Object.keys(notes).length === 0) return;
  document.querySelectorAll('input, textarea').forEach((el, i) => {
    const key = el.getAttribute('aria-label') || el.placeholder || 'field_' + i;
    if (notes[key]) {
      el.value = notes[key];
    }
  });
}

async function saveNotes() {
  const notes = collectNotes();
  showStatus('Saving...');
  try {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/assembly_notes?session_id=eq.${sessionId}&select=id`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const existing = await checkRes.json();
    if (existing.length > 0) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/assembly_notes?session_id=eq.${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ notes: notes })
        }
      );
    } else {
      await fetch(
        `${SUPABASE_URL}/rest/v1/assembly_notes`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ session_id: sessionId, notes: notes })
        }
      );
    }
    showStatus('Saved!');
    setTimeout(() => showStatus(''), 2000);
  } catch (err) {
    console.error('Save error:', err);
    showStatus('Save failed');
  }
}

async function loadNotes() {
  try {
    showStatus('Loading...');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/assembly_notes?session_id=eq.${sessionId}&select=notes`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    if (data.length > 0 && data[0].notes) {
      applyNotes(data[0].notes);
      showStatus('Notes loaded!');
    } else {
      showStatus('Ready - start typing!');
    }
    setTimeout(() => showStatus(''), 2000);
  } catch (err) {
    console.error('Load error:', err);
    showStatus('Offline mode');
  }
}

function debounceSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNotes, 1500);
  showStatus('Typing...');
}

function showStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function createStatusBar() {
  const bar = document.createElement('div');
  bar.id = 'save-status-bar';
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#4a5568,#2d3748);color:white;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;font-size:14px;z-index:9999;box-shadow:0 -2px 10px rgba(0,0,0,0.3);';
  const left = document.createElement('div');
  left.innerHTML = '<strong>Session:</strong> <a href="' + window.location.href + '" style="color:#90cdf4;text-decoration:none;">' + sessionId.substring(0, 20) + '...</a>';
  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.alignItems = 'center';
  right.style.gap = '12px';
  statusEl = document.createElement('span');
  statusEl.style.cssText = 'background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:12px;font-size:12px;';
  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Copy Share Link';
  shareBtn.style.cssText = 'background:#667eea;color:white;border:none;padding:6px 16px;border-radius:8px;cursor:pointer;font-size:13px;';
  shareBtn.onclick = function() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Copy Share Link'; }, 2000);
    });
  };
  right.appendChild(statusEl);
  right.appendChild(shareBtn);
  bar.appendChild(left);
  bar.appendChild(right);
  document.body.appendChild(bar);
  document.body.style.paddingBottom = '50px';
}

document.addEventListener('DOMContentLoaded', function() {
  sessionId = getSessionId();
  createStatusBar();
  loadNotes();
  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', debounceSave);
  });
});
