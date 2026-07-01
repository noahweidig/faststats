/* ── FastStats · app.js ── Main orchestrator ── */
import { SAMPLE_DATASETS, loadSampleDataset, loadUploadedFile, getDatasetInfo } from './data.js';
import { createStore, $, $$, el, populateSelect, showToast } from './utils.js';
import { icon } from './icons.js';
import { renderOverview } from './overview.js';
import { renderView } from './view.js';
import { renderWrangle } from './wrangle.js';
import { renderPlot } from './plot.js';
import { renderStats } from './stats.js';
import { renderReport } from './report.js';

const store = createStore({
  activeTab: 'overview',
  datasetMeta: null,
  datasetInfo: null,
  loading: true
});

const TAB_IDS = ['overview', 'view', 'wrangle', 'plot', 'stats', 'report'];

async function init() {
  showLoading(true);
  try {
    initTheme();
    initTabs();
    initUpload();
    initDragDrop();
    initShortcuts();
    initDatasetSelector();
    // Load default dataset (pure-JS engine — no async init needed)
    await switchDataset('iris');
  } catch (err) {
    console.error('[FastStats] Init error:', err);
    showInitError(err);
  } finally {
    // Always clear the overlay — never leave the app stuck on "Initializing".
    showLoading(false);
  }
}

function showInitError(err) {
  const loader = $('#loading-overlay');
  if (loader) {
    loader.innerHTML = `
      <div class="loader-error">
        <p><strong>Failed to load FastStats</strong></p>
        <p class="muted">${err.message}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">Reload</button>
      </div>`;
    loader.style.display = 'flex';
  }
  showToast('Failed to initialize: ' + err.message, 'error', 5000);
}

/* ── Light / dark theme ── */
function initTheme() {
  const btn = $('#theme-toggle');
  const setIcon = () => { if (btn) btn.innerHTML = icon(document.documentElement.getAttribute('data-theme') === 'light' ? 'moon' : 'sun'); };
  setIcon();
  btn?.addEventListener('click', async () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('fs-theme', next); } catch {}
    setIcon();
    // Re-render so theme-aware content (e.g. Plotly charts) picks up the new scheme
    await renderActiveTab(store.get('activeTab'));
  });
}

/* ── Keyboard shortcuts: Alt+1…6 switch tabs ── */
function initShortcuts() {
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const i = parseInt(e.key, 10) - 1;
    if (i >= 0 && i < TAB_IDS.length) { e.preventDefault(); switchTab(TAB_IDS[i]); }
  });
}

function initTabs() {
  const navBtns = $$('.nav-tab');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Initial tab from hash
  const hash = window.location.hash.replace('#', '');
  if (TAB_IDS.includes(hash)) switchTab(hash);
  else switchTab('overview');

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (TAB_IDS.includes(h) && h !== store.get('activeTab')) switchTab(h);
  });
}

async function switchTab(tab) {
  store.set('activeTab', tab);
  window.location.hash = tab;

  // Update nav
  $$('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Show/hide panels
  TAB_IDS.forEach(id => {
    const panel = $(`#tab-${id}`);
    if (panel) panel.style.display = id === tab ? 'block' : 'none';
  });

  // Render tab content
  await renderActiveTab(tab);
}

async function renderActiveTab(tab) {
  try {
    switch (tab) {
      case 'overview': renderOverview(store); break;
      case 'view': await renderView(store); break;
      case 'wrangle': await renderWrangle(store); break;
      case 'plot': await renderPlot(store); break;
      case 'stats': await renderStats(store); break;
      case 'report': renderReport(store); break;
    }
  } catch (err) {
    console.error(`[${tab}] render error:`, err);
  }
}

async function loadFile(file) {
  if (!file) return;
  showLoading(true);
  try {
    const meta = await loadUploadedFile(file, $('#header-check')?.checked ?? true);
    const info = await getDatasetInfo(meta);
    store.batch({ datasetMeta: meta, datasetInfo: info });

    // Update selector to show uploaded file
    const sel = $('#dataset-select');
    if (sel) {
      let uploadOpt = sel.querySelector('option[value="upload"]');
      if (!uploadOpt) {
        uploadOpt = el('option', { value: 'upload' }, `Uploaded: ${file.name}`);
        sel.prepend(uploadOpt);
      } else {
        uploadOpt.textContent = `Uploaded: ${file.name}`;
      }
      sel.value = 'upload';
    }

    updateCurrentData(info);
    showLoading(false);
    await renderActiveTab(store.get('activeTab'));
    showToast(`Loaded ${file.name}`, 'success');
  } catch (err) {
    showLoading(false);
    showToast('Upload failed: ' + err.message, 'error');
    console.error('[Upload]', err);
  }
}

function initUpload() {
  $('#file-upload')?.addEventListener('change', e => loadFile(e.target.files[0]));
}

/* Drag & drop a CSV / Excel file anywhere on the page to load it. */
function initDragDrop() {
  let overlay = null, depth = 0;
  const hide = () => { depth = 0; overlay?.remove(); overlay = null; };
  window.addEventListener('dragenter', e => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault();
    if (++depth === 1 && !overlay) {
      overlay = el('div', { className: 'drop-overlay' }, 'Drop your CSV / Excel file to load it');
      document.body.append(overlay);
    }
  });
  window.addEventListener('dragover', e => { if (overlay) e.preventDefault(); });
  window.addEventListener('dragleave', () => { if (overlay && --depth <= 0) hide(); });
  window.addEventListener('drop', e => {
    if (!overlay) return;
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    hide();
    if (file) loadFile(file);
  });
}

function initDatasetSelector() {
  const sel = $('#dataset-select');
  if (!sel) return;
  sel.addEventListener('change', async () => {
    const val = sel.value;
    if (val === 'upload') return; // Already loaded
    if (val && SAMPLE_DATASETS[val]) {
      showLoading(true);
      await switchDataset(val);
      showLoading(false);
    }
  });
}

async function switchDataset(id) {
  try {
    const meta = await loadSampleDataset(id);
    const info = await getDatasetInfo(meta);
    store.batch({ datasetMeta: meta, datasetInfo: info });
    updateCurrentData(info);
    await renderActiveTab(store.get('activeTab'));
  } catch (err) {
    console.error('[Dataset]', err);
    showToast('Failed to load dataset: ' + err.message, 'error');
  }
}

function updateCurrentData(info) {
  const nameEl = $('#current-data-name');
  const badgeEl = $('#current-data-badge');
  const dimsEl = $('#current-data-dims');

  if (nameEl) nameEl.textContent = info.name || 'No data';
  if (badgeEl) {
    badgeEl.textContent = info.sourceType === 'upload' ? 'Uploaded file' : 'Sample dataset';
    badgeEl.className = `badge ${info.sourceType === 'upload' ? 'badge-upload' : 'badge-sample'}`;
  }
  if (dimsEl) dimsEl.textContent = `${info.rowCount?.toLocaleString()} rows × ${info.colCount} columns`;
}

function showLoading(show) {
  const loader = $('#loading-overlay');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

// Start
document.addEventListener('DOMContentLoaded', init);
