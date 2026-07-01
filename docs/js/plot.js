/* ── FastStats · plot.js ── Plotly.js visualizations ── */
import { getRows, getSchema } from './engine.js';
import { getTableName } from './data.js';
import { getWrangledFrame, getSteps } from './wrangle.js';
import { loadPlotly } from './lazy.js';
import { $, $$, el, escapeHtml, showModal, copyToClipboard, showToast, debounce } from './utils.js';

/* Rows for plotting: wrangled frame when requested, else the active table. */
function getPlotData() {
  const useWrangled = $('#plot-use-wrangled')?.checked;
  if (useWrangled && getSteps().length > 0) return getWrangledFrame().rows;
  return getRows(getTableName());
}
function getPlotSchema() {
  const useWrangled = $('#plot-use-wrangled')?.checked;
  if (useWrangled && getSteps().length > 0) return getWrangledFrame().cols;
  return getSchema(getTableName());
}

const PLOT_TYPES = [
  ['auto', 'Auto'], ['scatter', 'Scatter'], ['histogram', 'Histogram'],
  ['density', 'Density'], ['boxplot', 'Box'], ['violin', 'Violin'],
  ['bar', 'Bar'], ['line', 'Line'], ['corr_matrix', 'Correlation Matrix']
];

const PALETTES = {
  default: null,
  viridis: ['#440154','#482878','#3e4989','#31688e','#26828e','#1f9e89','#35b779','#6ece58','#b5de2b','#fde725'],
  plasma: ['#0d0887','#46039f','#7201a8','#9c179e','#bd3786','#d8576b','#ed7953','#fb9f3a','#fdca26','#f0f921'],
  inferno: ['#000004','#1b0c41','#4a0c6b','#781c6d','#a52c60','#cf4446','#ed6925','#fb9b06','#f7d13d','#fcffa4'],
  brewer_Set2: ['#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f','#e5c494','#b3b3b3'],
  brewer_Dark2: ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d','#666666'],
  brewer_Spectral: ['#d53e4f','#f46d43','#fdae61','#fee08b','#e6f598','#abdda4','#66c2a5','#3288bd'],
};

const THEMES = {
  classic: { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(255,255,255,0.03)', font: { color: '#e2e8f0' }, gridcolor: 'rgba(148,163,184,0.1)' },
  minimal: { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' }, gridcolor: 'rgba(148,163,184,0.08)' },
  light: { paper_bgcolor: 'rgba(255,255,255,0.9)', plot_bgcolor: 'rgba(255,255,255,0.95)', font: { color: '#1e293b' }, gridcolor: 'rgba(0,0,0,0.1)' },
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
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="plot-use-wrangled"> Use wrangled data</label>
        </div>
        <div id="plot-var-selectors"></div>
        <div class="form-group">
          <label class="form-label">Plot type</label>
          <select id="plot-type" class="form-select">
            ${PLOT_TYPES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">X axis label</label>
          <input type="text" id="plot-xlabel" class="form-input" value="">
        </div>
        <div class="form-group">
          <label class="form-label">Y axis label</label>
          <input type="text" id="plot-ylabel" class="form-input" value="">
        </div>
        <div class="form-group">
          <label class="form-label">Legend title</label>
          <input type="text" id="plot-legend-label" class="form-input" value="">
        </div>
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="plot-bar-pct"> Bar %</label>
        </div>
        <div class="form-group">
          <label class="form-label">Bins <span id="plot-bins-val">30</span></label>
          <input type="range" id="plot-bins" min="5" max="200" value="30" class="form-range">
        </div>
        <div class="form-group">
          <label class="form-label">Opacity <span id="plot-alpha-val">0.8</span></label>
          <input type="range" id="plot-alpha" min="0.05" max="1" step="0.05" value="0.8" class="form-range">
        </div>
        <div class="form-group">
          <label class="form-label">Point/line size <span id="plot-size-val">2</span></label>
          <input type="range" id="plot-ptsize" min="0.5" max="10" step="0.5" value="2" class="form-range">
        </div>
        <div class="form-group">
          <label class="form-label">Trendlines</label>
          <label class="checkbox-option"><input type="checkbox" id="plot-trend-linear"> Linear fit</label>
          <label class="checkbox-option"><input type="checkbox" id="plot-trend-smooth" checked> Smooth curve</label>
        </div>
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="plot-free-y"> Facet free Y</label>
        </div>
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="plot-legend" checked> Show legend</label>
        </div>
        <div class="form-group">
          <label class="form-label">Theme</label>
          <select id="plot-theme" class="form-select">
            <option value="classic">Classic</option>
            <option value="minimal">Minimal</option>
            <option value="light">Light</option>
            <option value="dark" selected>Dark</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Palette</label>
          <select id="plot-palette" class="form-select">
            <option value="default">Default</option>
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="inferno">Inferno</option>
            <option value="brewer_Set2">Brewer Set2</option>
            <option value="brewer_Dark2">Brewer Dark2</option>
            <option value="brewer_Spectral">Brewer Spectral</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div class="form-group" id="plot-manual-colors-group" style="display:none">
          <label class="form-label">Manual colors (comma-separated)</label>
          <input type="text" id="plot-manual-colors" class="form-input" value="#6366f1,#ec4899,#14b8a6">
        </div>
        <div class="plot-actions">
          <button id="plot-download-png" class="btn btn-secondary btn-sm">Download PNG 📥</button>
          <button id="plot-show-sql" class="btn btn-secondary btn-sm">View SQL 🧾</button>
        </div>
      </div>
      <div class="plot-main">
        <div id="plot-container" class="plot-box"></div>
      </div>
    </div>
  `;

  await populateVarSelectors(store);
  bindPlotEvents(store);
  debouncedBuild(store);
}

function populateVarSelectors(store) {
  const container = $('#plot-var-selectors');
  if (!container) return;
  let schema;
  try {
    schema = getPlotSchema();
  } catch { schema = store.get('datasetInfo')?.schema || []; }

  const allCols = schema.map(s => s.name);
  const catCols = schema.filter(s => s.isCategorical || s.isDate).map(s => s.name);

  container.innerHTML = `
    <div class="form-group">
      <label class="form-label">X</label>
      <select id="plot-x" class="form-select">${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Y (optional)</label>
      <select id="plot-y" class="form-select"><option value="">None</option>${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Color (optional)</label>
      <select id="plot-color" class="form-select"><option value="">None</option>${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Facet (optional)</label>
      <select id="plot-facet" class="form-select"><option value="">None</option>${catCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    </div>
    <div id="plot-corr-vars-group" style="display:none" class="form-group">
      <label class="form-label">Numeric columns (corr matrix)</label>
      <div id="plot-corr-vars" class="multi-select-container">
        ${schema.filter(s => s.isNumeric).map(s => `<label class="multi-select-option"><input type="checkbox" value="${s.name}" checked> ${s.name}</label>`).join('')}
      </div>
    </div>
  `;
}

function bindPlotEvents(store) {
  const rebuild = debounce(() => debouncedBuild(store), 300);
  const ids = ['plot-type','plot-x','plot-y','plot-color','plot-facet','plot-theme','plot-palette',
               'plot-bar-pct','plot-free-y','plot-legend','plot-trend-linear','plot-trend-smooth'];
  ids.forEach(id => { const el = $(`#${id}`); if (el) el.addEventListener('change', rebuild); });

  ['plot-bins','plot-alpha','plot-ptsize'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('input', () => {
      const valEl = $(`#${id}-val`);
      if (valEl) valEl.textContent = el.value;
      rebuild();
    });
  });

  ['plot-xlabel','plot-ylabel','plot-legend-label','plot-manual-colors'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('input', rebuild);
  });

  $('#plot-use-wrangled')?.addEventListener('change', async () => { await populateVarSelectors(store); rebuild(); });

  $('#plot-palette')?.addEventListener('change', () => {
    const g = $('#plot-manual-colors-group');
    if (g) g.style.display = $('#plot-palette').value === 'manual' ? 'block' : 'none';
  });

  $('#plot-type')?.addEventListener('change', () => {
    const isCorr = $('#plot-type').value === 'corr_matrix';
    const varsGroup = $('#plot-corr-vars-group');
    const varSels = $('#plot-var-selectors');
    if (varsGroup) varsGroup.style.display = isCorr ? 'block' : 'none';
  });

  $('#plot-download-png')?.addEventListener('click', async () => {
    try {
      const Plotly = await loadPlotly();
      Plotly.downloadImage('plot-container', { format: 'png', width: 1200, height: 800, filename: 'faststats_plot' });
    } catch (e) { showToast('Download failed: ' + e.message, 'error'); }
  });

  $('#plot-show-sql')?.addEventListener('click', () => {
    const useWrangled = $('#plot-use-wrangled')?.checked && getSteps().length > 0;
    const rows = getPlotData();
    const cols = rows.length ? Object.keys(rows[0]).join(', ') : '(none)';
    const text = `Source: ${useWrangled ? 'wrangled data (pipeline applied)' : 'original dataset'}\nRows: ${rows.length}\nColumns: ${cols}`;
    const pre = el('pre', { className: 'code-block' }, text);
    const copyBtn = el('button', { className: 'btn btn-secondary btn-sm', onClick: async () => { await copyToClipboard(text); showToast('Copied!'); }}, 'Copy 📋');
    showModal('Plot Data Source', el('div', {}, [copyBtn, pre]));
  });
}

const debouncedBuild = debounce((store) => buildPlot(store), 200);

async function buildPlot(store) {
  const plotDiv = document.getElementById('plot-container');
  if (!plotDiv) return;

  const plotType = $('#plot-type')?.value || 'auto';
  const x = $('#plot-x')?.value;
  const y = $('#plot-y')?.value || '';
  const color = $('#plot-color')?.value || '';
  const facet = $('#plot-facet')?.value || '';
  const bins = parseInt($('#plot-bins')?.value || '30');
  const alpha = parseFloat($('#plot-alpha')?.value || '0.8');
  const ptSize = parseFloat($('#plot-ptsize')?.value || '2');
  const barPct = $('#plot-bar-pct')?.checked;
  const freeY = $('#plot-free-y')?.checked;
  const showLegend = $('#plot-legend')?.checked ?? true;
  const trendLinear = $('#plot-trend-linear')?.checked;
  const trendSmooth = $('#plot-trend-smooth')?.checked;
  const themeName = $('#plot-theme')?.value || 'dark';
  const paletteName = $('#plot-palette')?.value || 'default';
  const xLabel = $('#plot-xlabel')?.value || '';
  const yLabel = $('#plot-ylabel')?.value || '';
  const legendLabel = $('#plot-legend-label')?.value || '';
  const manualColors = ($('#plot-manual-colors')?.value || '').split(',').map(s => s.trim()).filter(Boolean);

  try {
    const data = getPlotData();
    if (!data.length) { plotDiv.innerHTML = '<div class="empty-state"><p>No data available.</p></div>'; return; }

    plotDiv.classList.add('plot-loading');
    const Plotly = await loadPlotly();
    plotDiv.classList.remove('plot-loading');

    if (plotType === 'corr_matrix') {
      await buildCorrMatrix(Plotly, plotDiv, data, store, themeName);
      return;
    }

    if (!x) { plotDiv.innerHTML = '<div class="empty-state"><p>Select an X variable.</p></div>'; return; }

    const xVals = data.map(r => r[x]);
    const yVals = y ? data.map(r => r[y]) : null;
    const colorVals = color ? data.map(r => r[color]) : null;
    const xIsNum = xVals.some(v => typeof v === 'number');
    const yIsNum = yVals?.some(v => typeof v === 'number');

    let actualType = plotType;
    if (actualType === 'auto') {
      if (yVals && xIsNum && yIsNum) actualType = 'scatter';
      else if (xIsNum && !yVals) actualType = 'histogram';
      else if (yVals && !xIsNum && yIsNum) actualType = 'boxplot';
      else if (!xIsNum && !yVals) actualType = 'bar';
      else actualType = 'scatter';
    }

    const colors = getColors(paletteName, manualColors, colorVals);
    const theme = THEMES[themeName] || THEMES.dark;

    let traces = [];
    const layout = {
      paper_bgcolor: theme.paper_bgcolor,
      plot_bgcolor: theme.plot_bgcolor,
      font: { ...theme.font, family: 'Inter, system-ui, sans-serif' },
      xaxis: { title: xLabel || x, gridcolor: theme.gridcolor, zeroline: false },
      yaxis: { title: yLabel || y || '', gridcolor: theme.gridcolor, zeroline: false },
      showlegend: showLegend,
      margin: { t: 30, r: 30, b: 60, l: 60 },
      legend: { title: { text: legendLabel || color || '' } },
      hovermode: 'closest',
    };

    if (facet && !['corr_matrix'].includes(actualType)) {
      const facetVals = [...new Set(data.map(r => r[facet]))].sort();
      traces = buildFacetedTraces(data, actualType, x, y, color, facetVals, facet, alpha, ptSize, bins, barPct, colors);
      // Use subplot annotations
      const nFacets = facetVals.length;
      const nCols = Math.min(nFacets, 3);
      const nRows = Math.ceil(nFacets / nCols);
      // Simple: Plotly doesn't have native facets, use one trace per facet with legendgroup
      // For simplicity, show all in one plot with legendgroup
    } else {
      if (color && colorVals) {
        const uniqueColors = [...new Set(colorVals)];
        uniqueColors.forEach((cv, i) => {
          const mask = data.filter(r => r[color] === cv);
          const trace = buildTrace(actualType, mask.map(r => r[x]), y ? mask.map(r => r[y]) : null, {
            name: String(cv), opacity: alpha, markerSize: ptSize, bins, barPct,
            color: colors[i % colors.length]
          });
          traces.push(trace);
        });
      } else {
        const trace = buildTrace(actualType, xVals, yVals, {
          opacity: alpha, markerSize: ptSize, bins, barPct,
          color: colors[0] || '#6366f1'
        });
        traces.push(trace);
      }

      // Trendlines for scatter
      if (actualType === 'scatter' && yVals) {
        if (trendLinear) traces.push(buildLinearTrend(xVals, yVals));
        if (trendSmooth) traces.push(buildSmoothTrend(xVals, yVals));
      }
    }

    if (actualType === 'histogram' || actualType === 'density') {
      if (barPct && actualType !== 'density') layout.yaxis.title = 'Proportion';
    }

    Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: true });

  } catch (err) {
    plotDiv.classList.remove('plot-loading');
    console.error('[Plot]', err);
    plotDiv.innerHTML = `<div class="empty-state"><p>Plot error: ${escapeHtml(err.message)}</p></div>`;
  }
}

function buildTrace(type, xVals, yVals, opts = {}) {
  const { name, opacity = 0.8, markerSize = 2, bins = 30, barPct = false, color = '#6366f1' } = opts;
  switch (type) {
    case 'scatter':
      return { x: xVals, y: yVals, mode: 'markers', type: 'scatter', name,
        marker: { color, size: markerSize, opacity } };
    case 'line':
      return { x: xVals, y: yVals, mode: 'lines', type: 'scatter', name,
        line: { color, width: markerSize / 1.5 }, opacity };
    case 'histogram':
      return { x: xVals, type: 'histogram', name, nbinsx: bins,
        marker: { color, opacity }, histnorm: barPct ? 'probability' : '' };
    case 'density':
      return { x: xVals, type: 'histogram', name, nbinsx: bins * 2,
        marker: { color, opacity: opacity * 0.5 }, histnorm: 'probability density' };
    case 'bar': {
      const counts = {};
      xVals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const labels = Object.keys(counts);
      let values = Object.values(counts);
      if (barPct) { const total = values.reduce((a,b) => a+b, 0); values = values.map(v => v/total); }
      return { x: labels, y: values, type: 'bar', name, marker: { color, opacity } };
    }
    case 'boxplot':
      return { x: xVals, y: yVals, type: 'box', name, marker: { color }, opacity, boxpoints: false };
    case 'violin':
      return { x: xVals, y: yVals, type: 'violin', name, marker: { color }, opacity, box: { visible: true }, meanline: { visible: true } };
    default:
      return { x: xVals, y: yVals, mode: 'markers', type: 'scatter', name, marker: { color, size: markerSize, opacity } };
  }
}

function buildFacetedTraces(data, type, x, y, color, facetVals, facetCol, alpha, ptSize, bins, barPct, colors) {
  const traces = [];
  facetVals.forEach((fv, fi) => {
    const subset = data.filter(r => r[facetCol] === fv);
    if (color) {
      const uniqueColors = [...new Set(subset.map(r => r[color]))];
      uniqueColors.forEach((cv, ci) => {
        const mask = subset.filter(r => r[color] === cv);
        traces.push({
          ...buildTrace(type, mask.map(r => r[x]), y ? mask.map(r => r[y]) : null, {
            name: `${fv} / ${cv}`, opacity: alpha, markerSize: ptSize, bins, barPct,
            color: colors[ci % colors.length]
          }),
          legendgroup: String(cv),
          showlegend: fi === 0
        });
      });
    } else {
      traces.push({
        ...buildTrace(type, subset.map(r => r[x]), y ? subset.map(r => r[y]) : null, {
          name: String(fv), opacity: alpha, markerSize: ptSize, bins, barPct,
          color: colors[fi % colors.length]
        })
      });
    }
  });
  return traces;
}

function buildLinearTrend(xVals, yVals) {
  const validPairs = xVals.map((x, i) => [x, yVals[i]]).filter(([x, y]) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y));
  if (validPairs.length < 2) return { x: [], y: [], mode: 'lines', type: 'scatter', showlegend: false };
  const xs = validPairs.map(p => p[0]), ys = validPairs.map(p => p[1]);
  const n = xs.length;
  const sx = xs.reduce((a,b) => a+b, 0), sy = ys.reduce((a,b) => a+b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const sorted = [...xs].sort((a,b) => a-b);
  const trendX = [sorted[0], sorted[sorted.length-1]];
  const trendY = trendX.map(x => slope * x + intercept);
  return { x: trendX, y: trendY, mode: 'lines', type: 'scatter', name: 'Linear fit',
    line: { color: '#f97316', dash: 'dash', width: 2 }, showlegend: true };
}

function buildSmoothTrend(xVals, yVals) {
  const validPairs = xVals.map((x, i) => [x, yVals[i]]).filter(([x, y]) => typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y));
  if (validPairs.length < 4) return { x: [], y: [], mode: 'lines', type: 'scatter', showlegend: false };
  validPairs.sort((a, b) => a[0] - b[0]);
  const xs = validPairs.map(p => p[0]), ys = validPairs.map(p => p[1]);
  // Moving average approximation of LOESS
  const windowSize = Math.max(3, Math.floor(xs.length * 0.15));
  const smoothX = [], smoothY = [];
  for (let i = 0; i < xs.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(xs.length, start + windowSize);
    const windowYs = ys.slice(start, end);
    smoothX.push(xs[i]);
    smoothY.push(windowYs.reduce((a, b) => a + b, 0) / windowYs.length);
  }
  return { x: smoothX, y: smoothY, mode: 'lines', type: 'scatter', name: 'Smooth',
    line: { color: '#10b981', width: 2.5 }, showlegend: true };
}

async function buildCorrMatrix(Plotly, plotDiv, data, store, themeName) {
  const checkboxes = $$('#plot-corr-vars input[type="checkbox"]:checked');
  let numCols = checkboxes.map(cb => cb.value);
  if (numCols.length < 2) {
    // Fallback: use all numeric columns
    const info = store.get('datasetInfo');
    numCols = info?.numericCols || [];
  }
  if (numCols.length < 2) { plotDiv.innerHTML = '<div class="empty-state"><p>Need at least 2 numeric columns.</p></div>'; return; }

  // Compute correlation matrix
  const n = data.length;
  const values = {};
  numCols.forEach(c => { values[c] = data.map(r => r[c]).filter(v => typeof v === 'number' && !isNaN(v)); });

  const corrMatrix = [];
  const annotations = [];
  for (let i = 0; i < numCols.length; i++) {
    const row = [];
    for (let j = 0; j < numCols.length; j++) {
      const r = pearsonCorr(values[numCols[i]], values[numCols[j]]);
      row.push(r);
      annotations.push({
        x: numCols[j], y: numCols[i], text: isNaN(r) ? '—' : r.toFixed(2),
        showarrow: false, font: { color: Math.abs(r) > 0.5 ? '#fff' : '#94a3b8', size: 12 }
      });
    }
    corrMatrix.push(row);
  }

  const theme = THEMES[themeName] || THEMES.dark;
  Plotly.react(plotDiv, [{
    z: corrMatrix, x: numCols, y: numCols, type: 'heatmap',
    colorscale: 'RdBu', reversescale: true, zmin: -1, zmax: 1,
    hoverongaps: false
  }], {
    paper_bgcolor: theme.paper_bgcolor, plot_bgcolor: theme.plot_bgcolor,
    font: { ...theme.font, family: 'Inter, system-ui, sans-serif' },
    annotations, margin: { t: 30, r: 30, b: 100, l: 100 },
    xaxis: { tickangle: 45 }, yaxis: { autorange: 'reversed' }
  }, { responsive: true });
}

function pearsonCorr(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return NaN;
  let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]; sy += y[i]; sxy += x[i]*y[i]; sxx += x[i]*x[i]; syy += y[i]*y[i];
  }
  const denom = Math.sqrt((n*sxx - sx*sx) * (n*syy - sy*sy));
  return denom === 0 ? 0 : (n*sxy - sx*sy) / denom;
}

function getColors(palette, manualColors, colorVals) {
  if (palette === 'manual' && manualColors.length) return manualColors;
  if (PALETTES[palette]) return PALETTES[palette];
  // Default pleasant colors
  return ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f97316','#64748b'];
}
