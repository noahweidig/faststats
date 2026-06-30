/* ── FastStats · view.js ── Data preview + summaries ── */
import { query, getSchema } from './db.js';
import { getTableName } from './data.js';
import { $, el, formatNumber, commaFormat, escapeHtml } from './utils.js';

let gridApi = null;

export async function renderView(store) {
  const container = $('#tab-view');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded. Upload a file or select a sample dataset.</p></div>'; return; }

  container.innerHTML = `
    <h3 class="section-title">Data Preview</h3>
    <div id="view-grid" class="ag-grid-container" style="height:420px;"></div>
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

  await Promise.all([renderGrid(info), renderNumSummary(info), renderCatSummary(info)]);
  const dims = $('#view-dims');
  if (dims) dims.textContent = `${commaFormat(info.rowCount)} rows × ${commaFormat(info.colCount)} columns`;
}

async function renderGrid(info) {
  const tableName = getTableName();
  const limit = Math.min(info.rowCount, 5000);
  const rows = await query(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
  const schema = info.schema;

  const gridDiv = document.getElementById('view-grid');
  if (!gridDiv) return;

  const columnDefs = schema.map(s => ({
    field: s.name, headerName: s.name, sortable: true, filter: true, resizable: true,
    flex: 1, minWidth: 100
  }));

  if (gridApi) { gridApi.destroy(); gridApi = null; }

  const gridOptions = {
    columnDefs,
    rowData: rows,
    defaultColDef: { sortable: true, filter: true, resizable: true },
    pagination: true,
    paginationPageSize: 50,
    domLayout: 'normal',
    theme: agGrid.themeAlpine.withParams({
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      foregroundColor: '#e2e8f0',
      headerBackgroundColor: 'rgba(30, 41, 59, 0.8)',
      headerForegroundColor: '#94a3b8',
      borderColor: 'rgba(148, 163, 184, 0.1)',
      rowHoverColor: 'rgba(99, 102, 241, 0.08)',
      selectedRowBackgroundColor: 'rgba(99, 102, 241, 0.15)',
      oddRowBackgroundColor: 'rgba(15, 23, 42, 0.3)',
    }),
  };

  gridApi = agGrid.createGrid(gridDiv, gridOptions);
}

async function renderNumSummary(info) {
  const container = document.getElementById('view-num-summary');
  if (!container) return;
  const numCols = info.schema.filter(s => s.isNumeric);
  if (numCols.length === 0) { container.innerHTML = '<p class="muted">No numeric columns.</p>'; return; }

  const tableName = getTableName();
  const aggs = numCols.map(c => `
    AVG("${c.name}") as "${c.name}_mean",
    STDDEV("${c.name}") as "${c.name}_sd",
    MIN("${c.name}") as "${c.name}_min",
    MAX("${c.name}") as "${c.name}_max"
  `).join(',\n');
  const result = await query(`SELECT ${aggs} FROM "${tableName}"`);
  const row = result[0] || {};

  let html = '<table class="data-table"><thead><tr><th>Variable</th><th>Mean</th><th>SD</th><th>Min</th><th>Max</th></tr></thead><tbody>';
  numCols.forEach(c => {
    html += `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td class="num">${formatNumber(row[c.name + '_mean'])}</td>
      <td class="num">${formatNumber(row[c.name + '_sd'])}</td>
      <td class="num">${formatNumber(row[c.name + '_min'])}</td>
      <td class="num">${formatNumber(row[c.name + '_max'])}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function renderCatSummary(info) {
  const container = document.getElementById('view-cat-summary');
  if (!container) return;
  const catCols = info.schema.filter(s => !s.isNumeric);
  if (catCols.length === 0) { container.innerHTML = '<p class="muted">No categorical columns.</p>'; return; }

  const tableName = getTableName();
  let html = '<table class="data-table"><thead><tr><th>Variable</th><th>Top Levels</th><th># Levels</th></tr></thead><tbody>';

  for (const c of catCols) {
    try {
      const topRows = await query(`SELECT "${c.name}" as val, COUNT(*) as n FROM "${tableName}" WHERE "${c.name}" IS NOT NULL GROUP BY "${c.name}" ORDER BY n DESC LIMIT 5`);
      const nLevels = await query(`SELECT COUNT(DISTINCT "${c.name}") as cnt FROM "${tableName}"`);
      const topStr = topRows.map(r => `${r.val} ${r.n}`).join(', ');
      html += `<tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(topStr)}</td>
        <td class="num">${nLevels[0]?.cnt ?? 0}</td>
      </tr>`;
    } catch {
      html += `<tr><td>${escapeHtml(c.name)}</td><td>—</td><td>—</td></tr>`;
    }
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}
