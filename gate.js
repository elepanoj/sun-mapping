// Shared passphrase gate for internal-only pages (index.html, qr-generator.html).
// Not real security — a hashed comparison so the passphrase isn't sitting in
// plaintext in view-source, just enough to keep casual visitors out.
const GATE_HASH = '646738929df6d663225067d155e3446fcf86d9925078a8cb33d372272ec284df';
const GATE_STORAGE_KEY = 'sunsetHorizonsUnlocked';

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function unlockGate() {
  document.getElementById('gate').style.display = 'none';
  document.getElementById('appContent').style.display = 'block';
}

async function tryUnlock() {
  const input = document.getElementById('gatePassphrase');
  const errorEl = document.getElementById('gateError');
  const hash = await sha256Hex(input.value);
  if (hash === GATE_HASH) {
    localStorage.setItem(GATE_STORAGE_KEY, '1');
    errorEl.textContent = '';
    unlockGate();
  } else {
    errorEl.textContent = 'Incorrect passphrase.';
    input.value = '';
    input.focus();
  }
}

function initGate() {
  if (localStorage.getItem(GATE_STORAGE_KEY) === '1') {
    unlockGate();
  } else {
    document.getElementById('gateSubmit').addEventListener('click', tryUnlock);
    document.getElementById('gatePassphrase').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryUnlock();
    });
    document.getElementById('gatePassphrase').focus();
  }
}

initGate();
