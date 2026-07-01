/* ── FastStats · plot.js ── Plotly.js visualizations ── */
import { getRows, getSchema, defaultCompare } from './engine.js';
import { getTableName } from './data.js';
import { getWrangledFrame, getSteps } from './wrangle.js';
import { loadPlotly } from './lazy.js';
import { $, $$, el, escapeHtml, showModal, copyToClipboard, showToast, debounce, downloadText } from './utils.js';
import { addReportItem } from './report.js';

function usingWrangled() { return $('#plot-use-wrangled')?.checked && getSteps().length > 0; }
function getPlotData() { return usingWrangled() ? getWrangledFrame().rows : getRows(getTableName()); }
function getPlotSchema() { return usingWrangled() ? getWrangledFrame().cols : getSchema(getTableName()); }

const PLOT_TYPES = [
  ['auto', 'Auto'], ['scatter', 'Scatter'], ['line', 'Line'], ['area', 'Area'],
  ['histogram', 'Histogram'], ['density', 'Density'], ['ecdf', 'ECDF'],
  ['boxplot', 'Box'], ['violin', 'Violin'], ['bar', 'Bar'], ['pie', 'Pie / Donut'],
  ['density_2d', '2D density'], ['corr_matrix', 'Correlation Matrix']
];

const PALETTES = {
  default: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#64748b'],
  viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
  plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
  inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
  brewer_Set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
  brewer_Dark2: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
  brewer_Spectral: ['#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd'],
};

const THEMES = {
  classic: { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(255,255,255,0.03)', font: { color: '#e2e8f0' }, gridcolor: 'rgba(148,163,184,0.1)' },
  minimal: { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' }, gridcolor: 'rgba(148,163,184,0.08)' },
  light: { paper_bgcolor: 'rgba(255,255,255,0.95)', plot_bgcolor: 'rgba(255,255,255,1)', font: { color: '#1e293b' }, gridcolor: 'rgba(0,0,0,0.1)' },
  dark: { paper_bgcolor: 'rgba(15,23,42,0.9)', plot_bgcolor: 'rgba(15,23,42,0.95)', font: { color: '#e2e8f0' }, gridcolor: 'rgba(148,163,184,0.15)' },
};

export async function renderPlot(store) {
  const container = $('#tab-plot');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded.</p></div>'; return; }

  container.innerHTML = `
    <div class="plot-layout">
      <div class="plot-sidebar">
        <label class="form-label chk-inline"><input type="checkbox" id="plot-use-wrangled"> Use wrangled data</label>

        <details open class="plot-section"><summary>Variables</summary>
          <div id="plot-var-selectors"></div>
        </details>

        <details open class="plot-section"><summary>Chart type</summary>
          <div class="form-group">
            <select id="plot-type" class="form-select">${PLOT_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          </div>
          <div class="form-group" id="plot-barmode-group" style="display:none">
            <label class="form-label">Bar / hist mode</label>
            <select id="plot-barmode" class="form-select">
              <option value="group">Grouped</option><option value="stack">Stacked</option>
              <option value="overlay">Overlay</option><option value="relative">Relative</option>
            </select>
          </div>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-bar-pct"> Normalize (proportion / %)</label>
          <div class="form-group" id="plot-trend-group">
            <label class="form-label">Trendlines (scatter)</label>
            <label class="checkbox-option"><input type="checkbox" id="plot-trend-linear"> Linear (OLS) fit</label>
            <label class="checkbox-option"><input type="checkbox" id="plot-trend-smooth" checked> Smooth curve</label>
          </div>
        </details>

        <details class="plot-section"><summary>Aesthetics</summary>
          <div class="form-group"><label class="form-label">Marker symbol</label>
            <select id="plot-symbol" class="form-select">
              ${['circle', 'square', 'diamond', 'cross', 'x', 'triangle-up', 'star'].map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Bins <span id="plot-bins-val">30</span></label>
            <input type="range" id="plot-bins" min="5" max="200" value="30" class="form-range"></div>
          <div class="form-group"><label class="form-label">Opacity <span id="plot-alpha-val">0.8</span></label>
            <input type="range" id="plot-alpha" min="0.05" max="1" step="0.05" value="0.8" class="form-range"></div>
          <div class="form-group"><label class="form-label">Point / line size <span id="plot-size-val">4</span></label>
            <input type="range" id="plot-ptsize" min="0.5" max="14" step="0.5" value="4" class="form-range"></div>
        </details>

        <details class="plot-section"><summary>Axes &amp; labels</summary>
          <div class="form-group"><label class="form-label">Title</label><input type="text" id="plot-title" class="form-input" placeholder="(optional)"></div>
          <div class="form-group"><label class="form-label">X axis label</label><input type="text" id="plot-xlabel" class="form-input"></div>
          <div class="form-group"><label class="form-label">Y axis label</label><input type="text" id="plot-ylabel" class="form-input"></div>
          <div class="form-group"><label class="form-label">Legend title</label><input type="text" id="plot-legend-label" class="form-input"></div>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-logx"> Log X</label>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-logy"> Log Y</label>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-grid" checked> Gridlines</label>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-legend" checked> Show legend</label>
        </details>

        <details class="plot-section"><summary>Facets</summary>
          <div class="form-group"><label class="form-label">Facet columns <span id="plot-facet-cols-val">3</span></label>
            <input type="range" id="plot-facet-cols" min="1" max="6" value="3" class="form-range"></div>
          <label class="form-label chk-inline"><input type="checkbox" id="plot-free-y"> Free Y scale per facet</label>
        </details>

        <details class="plot-section"><summary>Theme &amp; colors</summary>
          <div class="form-group"><label class="form-label">Theme</label>
            <select id="plot-theme" class="form-select">
              <option value="classic">Classic</option><option value="minimal">Minimal</option>
              <option value="light">Light</option><option value="dark" selected>Dark</option>
            </select></div>
          <div class="form-group"><label class="form-label">Palette</label>
            <select id="plot-palette" class="form-select">
              <option value="default">Default</option><option value="viridis">Viridis</option>
              <option value="plasma">Plasma</option><option value="inferno">Inferno</option>
              <option value="brewer_Set2">Brewer Set2</option><option value="brewer_Dark2">Brewer Dark2</option>
              <option value="brewer_Spectral">Brewer Spectral</option><option value="manual">Manual…</option>
            </select></div>
          <div class="form-group" id="plot-manual-colors-group" style="display:none">
            <label class="form-label">Manual colors (comma-separated)</label>
            <input type="text" id="plot-manual-colors" class="form-input" value="#6366f1,#ec4899,#14b8a6"></div>
        </details>

        <details class="plot-section"><summary>Export</summary>
          <div class="form-group"><label class="form-label">Format</label>
            <select id="plot-dl-format" class="form-select"><option value="png">PNG</option><option value="svg">SVG</option></select></div>
          <div class="dl-dims">
            <input type="number" id="plot-dl-width" class="form-input" value="1200" title="Width px">
            <input type="number" id="plot-dl-height" class="form-input" value="800" title="Height px">
          </div>
          <div class="plot-actions">
            <button id="plot-download" class="btn btn-secondary btn-sm">Download image</button>
            <button id="plot-add-report" class="btn btn-secondary btn-sm">Add to report</button>
            <button id="plot-download-data" class="btn btn-ghost btn-sm">Download data CSV</button>
            <button id="plot-show-data" class="btn btn-ghost btn-sm">Data source</button>
          </div>
        </details>
      </div>
      <div class="plot-main">
        <div class="plot-card"><div id="plot-container" class="plot-box"></div></div>
      </div>
    </div>`;

  await populateVarSelectors(store);
  bindPlotEvents(store);
  syncTypeUI();
  debouncedBuild(store);
}

function populateVarSelectors(store) {
  const container = $('#plot-var-selectors');
  if (!container) return;
  let schema;
  try { schema = getPlotSchema(); } catch { schema = store.get('datasetInfo')?.schema || []; }
  const allCols = schema.map(s => s.name);
  const catCols = schema.filter(s => s.isCategorical || s.isDate).map(s => s.name);
  const opt = (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;

  container.innerHTML = `
    <div class="form-group"><label class="form-label">X</label>
      <select id="plot-x" class="form-select">${allCols.map(opt).join('')}</select></div>
    <div class="form-group"><label class="form-label">Y (optional)</label>
      <select id="plot-y" class="form-select"><option value="">None</option>${allCols.map(opt).join('')}</select></div>
    <div class="form-group"><label class="form-label">Color (optional)</label>
      <select id="plot-color" class="form-select"><option value="">None</option>${allCols.map(opt).join('')}</select></div>
    <div class="form-group"><label class="form-label">Facet (optional)</label>
      <select id="plot-facet" class="form-select"><option value="">None</option>${catCols.map(opt).join('')}</select></div>
    <div id="plot-corr-vars-group" style="display:none" class="form-group">
      <label class="form-label">Numeric columns (corr matrix)</label>
      <div id="plot-corr-vars" class="multi-select-container">
        ${schema.filter(s => s.isNumeric).map(s => `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(s.name)}" checked> ${escapeHtml(s.name)}</label>`).join('')}
      </div>
    </div>`;
}

function bindPlotEvents(store) {
  const rebuild = debounce(() => debouncedBuild(store), 250);
  const changeIds = ['plot-type', 'plot-x', 'plot-y', 'plot-color', 'plot-facet', 'plot-theme', 'plot-palette',
    'plot-bar-pct', 'plot-free-y', 'plot-legend', 'plot-trend-linear', 'plot-trend-smooth',
    'plot-symbol', 'plot-barmode', 'plot-logx', 'plot-logy', 'plot-grid'];
  changeIds.forEach(id => $(`#${id}`)?.addEventListener('change', rebuild));

  ['plot-bins', 'plot-alpha', 'plot-ptsize', 'plot-facet-cols'].forEach(id => {
    $(`#${id}`)?.addEventListener('input', () => { const v = $(`#${id}-val`); if (v) v.textContent = $(`#${id}`).value; rebuild(); });
  });
  ['plot-title', 'plot-xlabel', 'plot-ylabel', 'plot-legend-label', 'plot-manual-colors'].forEach(id => $(`#${id}`)?.addEventListener('input', rebuild));

  $('#plot-use-wrangled')?.addEventListener('change', async () => { await populateVarSelectors(store); bindVarEvents(rebuild); syncTypeUI(); rebuild(); });
  bindVarEvents(rebuild);

  $('#plot-palette')?.addEventListener('change', () => {
    const g = $('#plot-manual-colors-group'); if (g) g.style.display = $('#plot-palette').value === 'manual' ? 'block' : 'none';
  });
  $('#plot-type')?.addEventListener('change', syncTypeUI);

  $('#plot-download')?.addEventListener('click', async () => {
    try {
      const Plotly = await loadPlotly();
      Plotly.downloadImage('plot-container', {
        format: $('#plot-dl-format')?.value || 'png',
        width: +($('#plot-dl-width')?.value || 1200), height: +($('#plot-dl-height')?.value || 800),
        filename: 'faststats_plot'
      });
    } catch (e) { showToast('Download failed: ' + e.message, 'error'); }
  });
  $('#plot-add-report')?.addEventListener('click', async () => {
    try {
      const Plotly = await loadPlotly();
      const url = await Plotly.toImage('plot-container', { format: 'png', width: 1000, height: 650 });
      const title = ($('#plot-title')?.value || `${$('#plot-type')?.value} plot`).trim();
      addReportItem({ kind: 'plot', title, html: `<h4>${escapeHtml(title)}</h4><img src="${url}" alt="${escapeHtml(title)}">`, md: `### ${title}\n\n![${title}](${url})\n`, text: title });
    } catch (e) { showToast('Could not capture plot: ' + e.message, 'error'); }
  });
  $('#plot-download-data')?.addEventListener('click', () => {
    const rows = getPlotData();
    if (!rows.length) return showToast('No data', 'error');
    const cols = Object.keys(rows[0]);
    const esc = v => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const csv = cols.join(',') + '\n' + rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
    downloadText(csv, 'plot_data.csv');
  });
  $('#plot-show-data')?.addEventListener('click', () => {
    const rows = getPlotData();
    const cols = rows.length ? Object.keys(rows[0]).join(', ') : '(none)';
    const text = `Source: ${usingWrangled() ? 'wrangled data (pipeline applied)' : 'original dataset'}\nRows: ${rows.length}\nColumns: ${cols}`;
    const pre = el('pre', { className: 'code-block' }, text);
    const copyBtn = el('button', { className: 'btn btn-secondary btn-sm', onClick: async () => { await copyToClipboard(text); showToast('Copied!'); } }, 'Copy');
    showModal('Plot Data Source', el('div', {}, [copyBtn, pre]));
  });
}

function bindVarEvents(rebuild) {
  ['plot-x', 'plot-y', 'plot-color', 'plot-facet'].forEach(id => $(`#${id}`)?.addEventListener('change', rebuild));
  $$('#plot-corr-vars input').forEach(cb => cb.addEventListener('change', rebuild));
}

/* Show/hide controls that only apply to certain chart types. */
function syncTypeUI() {
  const t = $('#plot-type')?.value;
  const show = (id, on) => { const e = $(`#${id}`); if (e) e.style.display = on ? '' : 'none'; };
  show('plot-corr-vars-group', t === 'corr_matrix');
  show('plot-barmode-group', ['bar', 'histogram', 'density'].includes(t) || t === 'auto');
  show('plot-trend-group', ['scatter', 'auto'].includes(t));
}

const debouncedBuild = debounce((store) => buildPlot(store), 200);

async function buildPlot(store) {
  const plotDiv = document.getElementById('plot-container');
  if (!plotDiv) return;
  const cfg = readConfig();

  try {
    const data = getPlotData();
    if (!data.length) { plotDiv.innerHTML = '<div class="empty-state"><p>No data available.</p></div>'; return; }

    plotDiv.classList.add('plot-loading');
    const Plotly = await loadPlotly();
    plotDiv.classList.remove('plot-loading');

    if (cfg.plotType === 'corr_matrix') return buildCorrMatrix(Plotly, plotDiv, data, store, cfg);
    if (!cfg.x) { plotDiv.innerHTML = '<div class="empty-state"><p>Select an X variable.</p></div>'; return; }

    const actualType = resolveType(cfg, data);
    const theme = THEMES[cfg.themeName] || THEMES.dark;
    const colors = getColors(cfg.paletteName, cfg.manualColors);
    // Global color map (consistent across facets)
    const colorMap = new Map();
    if (cfg.color) {
      const uniq = [...new Set(data.map(r => r[cfg.color]))].sort(defaultCompare);
      uniq.forEach((v, i) => colorMap.set(String(v), colors[i % colors.length]));
    }
    const tcfg = { ...cfg, colors, colorMap, actualType };

    const baseLayout = {
      paper_bgcolor: theme.paper_bgcolor, plot_bgcolor: theme.plot_bgcolor,
      font: { ...theme.font, family: 'Inter, system-ui, sans-serif' },
      showlegend: cfg.showLegend, hovermode: 'closest',
      legend: { title: { text: cfg.legendLabel || cfg.color || '' } },
      margin: { t: cfg.title ? 50 : 30, r: 20, b: 55, l: 60 },
      barmode: cfg.barmode,
    };
    if (cfg.title) baseLayout.title = { text: cfg.title, font: { size: 16 } };

    const facetable = !['corr_matrix', 'pie', 'density_2d'].includes(actualType);
    if (cfg.facet && facetable) {
      buildFaceted(Plotly, plotDiv, data, tcfg, theme, baseLayout);
    } else {
      const traces = tracesFor(data, tcfg, '', true);
      const axis = axisStyle(theme, cfg);
      const layout = { ...baseLayout,
        xaxis: { title: cfg.xLabel || cfg.x, ...axis.x },
        yaxis: { title: cfg.yLabel || cfg.y || countLabel(actualType, cfg), ...axis.y },
      };
      Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: true, displaylogo: false });
    }
  } catch (err) {
    plotDiv.classList.remove('plot-loading');
    console.error('[Plot]', err);
    plotDiv.innerHTML = `<div class="empty-state"><p>Plot error: ${escapeHtml(err.message)}</p></div>`;
  }
}

function readConfig() {
  return {
    plotType: $('#plot-type')?.value || 'auto',
    x: $('#plot-x')?.value, y: $('#plot-y')?.value || '', color: $('#plot-color')?.value || '', facet: $('#plot-facet')?.value || '',
    bins: parseInt($('#plot-bins')?.value || '30'), alpha: parseFloat($('#plot-alpha')?.value || '0.8'),
    ptSize: parseFloat($('#plot-ptsize')?.value || '4'), barPct: $('#plot-bar-pct')?.checked,
    freeY: $('#plot-free-y')?.checked, showLegend: $('#plot-legend')?.checked ?? true,
    trendLinear: $('#plot-trend-linear')?.checked, trendSmooth: $('#plot-trend-smooth')?.checked,
    themeName: $('#plot-theme')?.value || 'dark', paletteName: $('#plot-palette')?.value || 'default',
    title: ($('#plot-title')?.value || '').trim(), xLabel: $('#plot-xlabel')?.value || '', yLabel: $('#plot-ylabel')?.value || '',
    legendLabel: $('#plot-legend-label')?.value || '', manualColors: ($('#plot-manual-colors')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    symbol: $('#plot-symbol')?.value || 'circle', barmode: $('#plot-barmode')?.value || 'group',
    logx: $('#plot-logx')?.checked, logy: $('#plot-logy')?.checked, grid: $('#plot-grid')?.checked ?? true,
    facetCols: parseInt($('#plot-facet-cols')?.value || '3'),
  };
}

function axisStyle(theme, cfg) {
  const g = cfg.grid ? theme.gridcolor : 'rgba(0,0,0,0)';
  return {
    x: { gridcolor: g, zeroline: false, showgrid: cfg.grid, type: cfg.logx ? 'log' : '-' },
    y: { gridcolor: g, zeroline: false, showgrid: cfg.grid, type: cfg.logy ? 'log' : '-' },
  };
}
function countLabel(type, cfg) {
  if (type === 'histogram' || type === 'bar') return cfg.barPct ? 'Proportion' : 'Count';
  if (type === 'ecdf') return 'Cumulative proportion';
  if (type === 'density') return 'Density';
  return '';
}

function resolveType(cfg, data) {
  if (cfg.plotType !== 'auto') return cfg.plotType;
  const xIsNum = data.some(r => typeof r[cfg.x] === 'number');
  const yIsNum = cfg.y && data.some(r => typeof r[cfg.y] === 'number');
  if (cfg.y && xIsNum && yIsNum) return 'scatter';
  if (xIsNum && !cfg.y) return 'histogram';
  if (cfg.y && !xIsNum && yIsNum) return 'boxplot';
  if (!xIsNum && !cfg.y) return 'bar';
  return 'scatter';
}

/* Build traces for one data subset, assigned to axis suffix (''/'2'/'3'…). */
function tracesFor(subset, cfg, axisSuffix, isFirstFacet) {
  const assign = t => { t.xaxis = 'x' + axisSuffix; t.yaxis = 'y' + axisSuffix; return t; };
  const { x, y, color, actualType, alpha, ptSize, bins, barPct, colors, colorMap, symbol } = cfg;
  const out = [];

  if (color && !['pie'].includes(actualType)) {
    const vals = [...new Set(subset.map(r => r[color]))].sort(defaultCompare);
    vals.forEach(cv => {
      const mask = subset.filter(r => String(r[color]) === String(cv));
      const t = buildTrace(actualType, mask.map(r => r[x]), y ? mask.map(r => r[y]) : null,
        { name: String(cv), opacity: alpha, markerSize: ptSize, bins, barPct, color: colorMap.get(String(cv)) || colors[0], symbol });
      t.legendgroup = String(cv); t.showlegend = isFirstFacet;
      out.push(assign(t));
      if (actualType === 'scatter' && y) addTrends(out, mask.map(r => r[x]), mask.map(r => r[y]), cfg, assign, isFirstFacet, String(cv));
    });
  } else {
    const t = buildTrace(actualType, subset.map(r => r[x]), y ? subset.map(r => r[y]) : null,
      { opacity: alpha, markerSize: ptSize, bins, barPct, color: colors[0], symbol });
    t.showlegend = false;
    out.push(assign(t));
    if (actualType === 'scatter' && y) addTrends(out, subset.map(r => r[x]), subset.map(r => r[y]), cfg, assign, isFirstFacet, '');
  }
  return out;
}

function addTrends(out, xVals, yVals, cfg, assign, show, groupName) {
  if (cfg.trendLinear) { const t = buildLinearTrend(xVals, yVals); t.name = groupName ? `${groupName} fit` : 'Linear fit'; t.showlegend = show; out.push(assign(t)); }
  if (cfg.trendSmooth) { const t = buildSmoothTrend(xVals, yVals); t.name = groupName ? `${groupName} smooth` : 'Smooth'; t.showlegend = show; out.push(assign(t)); }
}

function buildTrace(type, xVals, yVals, opts = {}) {
  const { name, opacity = 0.8, markerSize = 4, bins = 30, barPct = false, color = '#6366f1', symbol = 'circle' } = opts;
  switch (type) {
    case 'scatter':
      return { x: xVals, y: yVals, mode: 'markers', type: 'scattergl', name, marker: { color, size: markerSize, opacity, symbol } };
    case 'line':
      return { x: xVals, y: yVals, mode: 'lines', type: 'scatter', name, line: { color, width: markerSize / 1.5 }, opacity };
    case 'area':
      return { x: xVals, y: yVals, mode: 'lines', type: 'scatter', name, line: { color, width: markerSize / 2 }, fill: 'tozeroy', opacity: opacity * 0.7 };
    case 'histogram':
      return { x: xVals, type: 'histogram', name, nbinsx: bins, marker: { color, opacity }, histnorm: barPct ? 'probability' : '' };
    case 'density':
      return { x: xVals, type: 'histogram', name, nbinsx: bins * 2, marker: { color, opacity: opacity * 0.5 }, histnorm: 'probability density' };
    case 'ecdf': {
      const nums = xVals.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
      const n = nums.length;
      return { x: nums, y: nums.map((_, i) => (i + 1) / n), mode: 'lines', type: 'scatter', name, line: { color, width: 2, shape: 'hv' } };
    }
    case 'bar': {
      const counts = {};
      xVals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const labels = Object.keys(counts);
      let values = Object.values(counts);
      if (barPct) { const total = values.reduce((a, b) => a + b, 0); values = values.map(v => v / total); }
      return { x: labels, y: values, type: 'bar', name, marker: { color, opacity } };
    }
    case 'pie': {
      const counts = {};
      xVals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      return { labels: Object.keys(counts), values: Object.values(counts), type: 'pie', hole: 0.4, name };
    }
    case 'boxplot':
      return { x: xVals, y: yVals, type: 'box', name, marker: { color }, opacity, boxpoints: 'outliers' };
    case 'violin':
      return { x: xVals, y: yVals, type: 'violin', name, marker: { color }, opacity, box: { visible: true }, meanline: { visible: true } };
    case 'density_2d':
      return { x: xVals, y: yVals, type: 'histogram2dcontour', colorscale: 'Viridis', ncontours: 20, showscale: true };
    default:
      return { x: xVals, y: yVals, mode: 'markers', type: 'scattergl', name, marker: { color, size: markerSize, opacity, symbol } };
  }
}

/* ── Real Plotly subplot faceting ── */
function buildFaceted(Plotly, plotDiv, data, cfg, theme, baseLayout) {
  const facetVals = [...new Set(data.map(r => r[cfg.facet]))].sort(defaultCompare);
  const nF = facetVals.length;
  const nCols = Math.min(cfg.facetCols, nF);
  const nRows = Math.ceil(nF / nCols);
  const hGap = 0.06, vGap = 0.10;
  const cellW = (1 - hGap * (nCols - 1)) / nCols;
  const cellH = (1 - vGap * (nRows - 1)) / nRows;
  const axis = axisStyle(theme, cfg);

  const traces = [];
  const annotations = [];
  const layout = { ...baseLayout, margin: { t: cfg.title ? 55 : 35, r: 20, b: 45, l: 55 }, annotations };

  facetVals.forEach((fv, i) => {
    const suffix = i === 0 ? '' : String(i + 1);
    const col = i % nCols, row = Math.floor(i / nCols);
    const x0 = col * (cellW + hGap), x1 = x0 + cellW;
    const yTop = 1 - row * (cellH + vGap), y0 = yTop - cellH;

    layout['xaxis' + suffix] = { domain: [x0, x1], anchor: 'y' + suffix, matches: i === 0 ? undefined : 'x', ...axis.x, title: row === nRows - 1 ? (cfg.xLabel || cfg.x) : '' };
    layout['yaxis' + suffix] = { domain: [y0, yTop], anchor: 'x' + suffix, matches: (i === 0 || cfg.freeY) ? undefined : 'y', ...axis.y, title: col === 0 ? (cfg.yLabel || cfg.y || '') : '' };

    annotations.push({ text: `${cfg.facet} = ${fv}`, x: (x0 + x1) / 2, y: yTop + 0.012, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 12, color: theme.font.color } });

    const subset = data.filter(r => r[cfg.facet] === fv);
    tracesFor(subset, cfg, suffix, i === 0).forEach(t => traces.push(t));
  });

  Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: true, displaylogo: false });
}

function buildLinearTrend(xVals, yVals) {
  const pairs = xVals.map((x, i) => [x, yVals[i]]).filter(([x, y]) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y));
  if (pairs.length < 2) return { x: [], y: [], mode: 'lines', type: 'scatter', showlegend: false };
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]), n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sxx = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), intercept = (sy - slope * sx) / n;
  const sorted = [...xs].sort((a, b) => a - b);
  const tx = [sorted[0], sorted[sorted.length - 1]];
  return { x: tx, y: tx.map(x => slope * x + intercept), mode: 'lines', type: 'scatter', name: 'Linear fit', line: { color: '#f97316', dash: 'dash', width: 2 } };
}

function buildSmoothTrend(xVals, yVals) {
  const pairs = xVals.map((x, i) => [x, yVals[i]]).filter(([x, y]) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y));
  if (pairs.length < 4) return { x: [], y: [], mode: 'lines', type: 'scatter', showlegend: false };
  pairs.sort((a, b) => a[0] - b[0]);
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const w = Math.max(3, Math.floor(xs.length * 0.15));
  const sx = [], sy = [];
  for (let i = 0; i < xs.length; i++) {
    const start = Math.max(0, i - (w >> 1)), end = Math.min(xs.length, start + w);
    const win = ys.slice(start, end);
    sx.push(xs[i]); sy.push(win.reduce((a, b) => a + b, 0) / win.length);
  }
  return { x: sx, y: sy, mode: 'lines', type: 'scatter', name: 'Smooth', line: { color: '#10b981', width: 2.5 } };
}

async function buildCorrMatrix(Plotly, plotDiv, data, store, cfg) {
  const checked = $$('#plot-corr-vars input[type="checkbox"]:checked');
  let numCols = checked.map(cb => cb.value);
  if (numCols.length < 2) numCols = store.get('datasetInfo')?.numericCols || [];
  if (numCols.length < 2) { plotDiv.innerHTML = '<div class="empty-state"><p>Need at least 2 numeric columns.</p></div>'; return; }

  const values = {};
  numCols.forEach(c => { values[c] = data.map(r => r[c]); });
  const z = [], annotations = [];
  for (let i = 0; i < numCols.length; i++) {
    const row = [];
    for (let j = 0; j < numCols.length; j++) {
      const pairs = values[numCols[i]].map((v, k) => [v, values[numCols[j]][k]]).filter(([a, b]) => typeof a === 'number' && typeof b === 'number' && !isNaN(a) && !isNaN(b));
      const r = pearsonCorr(pairs.map(p => p[0]), pairs.map(p => p[1]));
      row.push(r);
      annotations.push({ x: numCols[j], y: numCols[i], text: isNaN(r) ? '—' : r.toFixed(2), showarrow: false, font: { color: Math.abs(r) > 0.5 ? '#fff' : '#94a3b8', size: 12 } });
    }
    z.push(row);
  }
  const theme = THEMES[cfg.themeName] || THEMES.dark;
  Plotly.react(plotDiv, [{ z, x: numCols, y: numCols, type: 'heatmap', colorscale: 'RdBu', reversescale: true, zmin: -1, zmax: 1, hoverongaps: false }],
    { paper_bgcolor: theme.paper_bgcolor, plot_bgcolor: theme.plot_bgcolor, font: { ...theme.font, family: 'Inter, system-ui, sans-serif' },
      title: cfg.title ? { text: cfg.title } : undefined, annotations, margin: { t: cfg.title ? 50 : 30, r: 30, b: 100, l: 100 },
      xaxis: { tickangle: 45 }, yaxis: { autorange: 'reversed' } }, { responsive: true, displaylogo: false });
}

function pearsonCorr(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return NaN;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxy += x[i] * y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; }
  const d = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

function getColors(palette, manualColors) {
  if (palette === 'manual' && manualColors.length) return manualColors;
  return PALETTES[palette] || PALETTES.default;
}
