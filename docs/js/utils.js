/* ── FastStats · utils.js ── */
export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k === 'textContent') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v);
  }
  if (typeof children === 'string') e.textContent = children;
  else if (Array.isArray(children)) children.forEach(c => { if (c) e.append(typeof c === 'string' ? document.createTextNode(c) : c); });
  else if (children instanceof Node) e.append(children);
  return e;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function formatNumber(x, digits = 3) {
  if (x == null || isNaN(x)) return '—';
  return Number(x).toFixed(digits);
}

export function formatInteger(x) {
  if (x == null || isNaN(x)) return '—';
  return Math.round(x).toLocaleString();
}

export function formatPValue(p) {
  if (p == null || isNaN(p)) return '—';
  return p < 0.001 ? '<0.001' : Number(p).toFixed(3);
}

export function commaFormat(n) {
  return Number(n).toLocaleString();
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(text, filename, mime = 'text/csv') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function classifyColumn(values, colName) {
  if (!values || values.length === 0) return 'text';
  const sample = values.filter(v => v != null).slice(0, 100);
  if (sample.length === 0) return 'text';
  const allNum = sample.every(v => typeof v === 'number' || (typeof v === 'bigint'));
  if (allNum) return 'numeric';
  const datePattern = /^\d{4}-\d{2}-\d{2}/;
  const allDate = sample.every(v => typeof v === 'string' && datePattern.test(v));
  if (allDate) return 'date';
  return 'categorical';
}

export function truncate(text, max = 60) {
  if (!text || text.length <= max) return text || '';
  return text.slice(0, max - 3) + '...';
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showModal(title, contentEl, { footer = null, size = 'lg' } = {}) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: `modal-dialog modal-${size}` });
  const header = el('div', { className: 'modal-header' }, [
    el('h3', { className: 'modal-title' }, title),
    el('button', { className: 'modal-close', 'aria-label': 'Close', onClick: () => overlay.remove() }, '✕')
  ]);
  const body = el('div', { className: 'modal-body' });
  if (typeof contentEl === 'string') body.innerHTML = contentEl;
  else body.append(contentEl);
  modal.append(header, body);
  if (footer) { const ft = el('div', { className: 'modal-footer' }); ft.append(footer); modal.append(ft); }
  overlay.append(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
  return overlay;
}

export function showToast(message, type = 'success', duration = 2500) {
  const toast = el('div', { className: `toast toast-${type}` }, message);
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
}

export function buildTable(columns, rows, { className = '' } = {}) {
  const table = el('table', { className: `data-table ${className}` });
  const thead = el('thead');
  const headerRow = el('tr');
  columns.forEach(col => headerRow.append(el('th', {}, typeof col === 'string' ? col : col.label)));
  thead.append(headerRow);
  table.append(thead);
  const tbody = el('tbody');
  rows.forEach(row => {
    const tr = el('tr');
    columns.forEach((col, i) => {
      const key = typeof col === 'string' ? col : col.key;
      const val = row[key] ?? row[i];
      const td = el('td', {}, val == null ? '' : String(val));
      if (typeof val === 'number') td.style.textAlign = 'right';
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

/* Simple reactive state */
export function createStore(initial = {}) {
  let state = { ...initial };
  const listeners = new Map();
  return {
    get(key) { return state[key]; },
    set(key, value) {
      if (state[key] === value) return;
      state[key] = value;
      (listeners.get(key) || []).forEach(fn => fn(value, key));
      (listeners.get('*') || []).forEach(fn => fn(value, key));
    },
    getAll() { return { ...state }; },
    on(key, fn) {
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
      return () => { const arr = listeners.get(key); arr.splice(arr.indexOf(fn), 1); };
    },
    batch(updates) {
      const changed = [];
      for (const [k, v] of Object.entries(updates)) {
        if (state[k] !== v) { state[k] = v; changed.push(k); }
      }
      changed.forEach(k => {
        (listeners.get(k) || []).forEach(fn => fn(state[k], k));
      });
      if (changed.length) (listeners.get('*') || []).forEach(fn => fn(null, changed));
    }
  };
}

export function makeSelectOptions(values, selected = null, placeholder = null) {
  let html = '';
  if (placeholder) html += `<option value="">${escapeHtml(placeholder)}</option>`;
  values.forEach(v => {
    const [val, label] = Array.isArray(v) ? v : [v, v];
    const sel = val === selected ? ' selected' : '';
    html += `<option value="${escapeHtml(String(val))}"${sel}>${escapeHtml(String(label))}</option>`;
  });
  return html;
}

export function populateSelect(selectEl, values, selected = null, placeholder = null) {
  selectEl.innerHTML = makeSelectOptions(values, selected, placeholder);
}

export function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}
