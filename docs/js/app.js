/* ── FastStats · app.js ── Main orchestrator ── */
import { initDB } from './db.js';
import { SAMPLE_DATASETS, loadSampleDataset, loadUploadedFile, getDatasetInfo } from './data.js';
import { createStore, $, $$, el, populateSelect, showToast } from './utils.js';
import { renderOverview } from './overview.js';
import { renderView } from './view.js';
import { renderWrangle } from './wrangle.js';
import { renderPlot } from './plot.js';
import { renderStats } from './stats.js';

const store = createStore({
  activeTab: 'overview',
  datasetMeta: null,
  datasetInfo: null,
  loading: true
});

const TAB_IDS = ['overview', 'view', 'wrangle', 'plot', 'stats'];

async function init() {
  showLoading(true);
  try {
    await initDB();
    initTabs();
    initUpload();
    initDatasetSelector();
    // Load default dataset
    await switchDataset('iris');
    showLoading(false);
  } catch (err) {
    console.error('[FastStats] Init error:', err);
    showLoading(false);
    showToast('Failed to initialize: ' + err.message, 'error', 5000);
  }
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
    }
  } catch (err) {
    console.error(`[${tab}] render error:`, err);
  }
}

function initUpload() {
  const fileInput = $('#file-upload');
  const headerCheck = $('#header-check');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showLoading(true);
      try {
        const meta = await loadUploadedFile(file, headerCheck?.checked ?? true);
        const info = await getDatasetInfo(meta);
        store.batch({ datasetMeta: meta, datasetInfo: info });

        // Update selector to show uploaded file
        const sel = $('#dataset-select');
        if (sel) {
          // Add upload option if not present
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
    });
  }
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
