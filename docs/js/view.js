/* ── FastStats · view.js ── Data preview + summaries ── */
import { getRows } from './engine.js';
import { getTableName } from './data.js';
import { createGrid } from './grid.js';
import { $, formatNumber, commaFormat, escapeHtml } from './utils.js';

let grid = null;

export function renderView(store) {
  const container = $('#tab-view');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded. Upload a file or select a sample dataset.</p></div>'; return; }

  container.innerHTML = `
    <h3 class="section-title">Data Preview</h3>
    <div id="view-grid" class="grid-container" style="height:440px;"></div>
    <div id="view-dims" class="dims-label"></div>
    <div class="view-summaries">
      <div class="summary-section">
        <h3 class="section-title">Numeric Variables</h3>
        <div id="view-num-summary"></div>
      </div>
      <div class="summary-section">
        <h3 class="section-title">Categorical / Date Variables</h3>
        <div id="view-cat-summary"></div>
      </div>
    </div>
  `;

  renderGrid(info);
  renderNumSummary(info);
  renderCatSummary(info);
  const dims = $('#view-dims');
  if (dims) dims.textContent = `${commaFormat(info.rowCount)} rows × ${commaFormat(info.colCount)} columns`;
}

function renderGrid(info) {
  const rows = getRows(getTableName());
  const gridDiv = document.getElementById('view-grid');
  if (!gridDiv) return;
  const columns = info.schema.map(s => ({ field: s.name, headerName: s.name }));
  if (grid) { grid.destroy(); grid = null; }
  grid = createGrid(gridDiv, { columns, rows, pageSize: 50 });
}

function numericStats(vals) {
  const v = vals.filter(x => typeof x === 'number' && !isNaN(x));
  const n = v.length;
  if (!n) return { mean: null, sd: null, min: null, max: null, median: null };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : null;
  const sorted = [...v].sort((a, b) => a - b);
  const m = n >> 1;
  const median = n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  return { mean, sd, min: sorted[0], max: sorted[n - 1], median };
}

function renderNumSummary(info) {
  const container = document.getElementById('view-num-summary');
  if (!container) return;
  const numCols = info.schema.filter(s => s.isNumeric);
  if (numCols.length === 0) { container.innerHTML = '<p class="muted">No numeric columns.</p>'; return; }

  const rows = getRows(getTableName());
  let html = '<table class="data-table"><thead><tr><th>Variable</th><th class="num">Mean</th><th class="num">SD</th><th class="num">Min</th><th class="num">Median</th><th class="num">Max</th></tr></thead><tbody>';
  numCols.forEach(c => {
    const s = numericStats(rows.map(r => r[c.name]));
    html += `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td class="num">${formatNumber(s.mean)}</td>
      <td class="num">${formatNumber(s.sd)}</td>
      <td class="num">${formatNumber(s.min)}</td>
      <td class="num">${formatNumber(s.median)}</td>
      <td class="num">${formatNumber(s.max)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderCatSummary(info) {
  const container = document.getElementById('view-cat-summary');
  if (!container) return;
  const catCols = info.schema.filter(s => !s.isNumeric);
  if (catCols.length === 0) { container.innerHTML = '<p class="muted">No categorical columns.</p>'; return; }

  const rows = getRows(getTableName());
  let html = '<table class="data-table"><thead><tr><th>Variable</th><th>Top Levels</th><th class="num"># Levels</th><th class="num"># Missing</th></tr></thead><tbody>';
  for (const c of catCols) {
    const counts = new Map();
    let missing = 0;
    for (const r of rows) {
      const v = r[c.name];
      if (v == null) { missing++; continue; }
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([val, n]) => `${val} (${n})`).join(', ');
    html += `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(top)}</td>
      <td class="num">${counts.size}</td>
      <td class="num">${missing}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}
