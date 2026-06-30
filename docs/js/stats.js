/* ── FastStats · stats.js ── Statistical analysis ── */
import { query, getSchema } from './db.js';
import { getTableName } from './data.js';
import { buildPipelineSQL, getSteps } from './wrangle.js';
import { $, $$, el, escapeHtml, formatNumber, formatPValue, formatInteger, showModal, copyToClipboard, showToast, debounce } from './utils.js';

const TESTS = [
  ['lm', 'Linear Regression'],
  ['anova', 'ANOVA'],
  ['kruskal', 'Kruskal-Wallis'],
  ['paired_t', 'Paired t-test'],
  ['wilcoxon_signed', 'Wilcoxon Signed-Rank'],
  ['unpaired_t', 'Unpaired t-test'],
  ['mann_whitney', 'Mann-Whitney U'],
  ['pearson_cor', 'Pearson Correlation'],
  ['spearman_cor', 'Spearman Correlation'],
  ['chisq', 'Chi-squared Test']
];

export async function renderStats(store) {
  const container = $('#tab-stats');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded.</p></div>'; return; }

  const allCols = info.allCols || [];

  container.innerHTML = `
    <div class="stats-layout">
      <div class="stats-sidebar">
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="stat-use-wrangled"> Use wrangled data</label>
        </div>
        <div class="form-group">
          <label class="form-label">Analysis</label>
          <select id="stat-test" class="form-select">
            ${TESTS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Predictor / grouping (X)</label>
          <select id="stat-x" class="form-select">${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Response / comparison (Y)</label>
          <select id="stat-y" class="form-select">${allCols.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
        <div id="stat-group-container"></div>
        <p class="help-text">Choose variables and click Run Analysis.</p>
        <button id="stat-run" class="btn btn-primary">Run Analysis</button>
      </div>
      <div class="stats-main">
        <h3 class="section-title">Results</h3>
        <div id="stat-results">
          <div class="empty-state">
            <p>Configure your test and click "Run Analysis" to see results.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind events
  $('#stat-run')?.addEventListener('click', () => runAnalysis(store));
  $('#stat-test')?.addEventListener('change', () => updateGroupUI(store));
  $('#stat-x')?.addEventListener('change', () => updateGroupUI(store));
  updateGroupUI(store);
}

async function updateGroupUI(store) {
  const container = $('#stat-group-container');
  if (!container) return;
  const test = $('#stat-test')?.value;
  const xCol = $('#stat-x')?.value;
  if (!test || !xCol) { container.innerHTML = ''; return; }

  const needsGroups = ['anova','kruskal','unpaired_t','mann_whitney'].includes(test);
  if (!needsGroups) { container.innerHTML = ''; return; }

  try {
    const sql = getStatsSQL();
    const levels = await query(`SELECT DISTINCT "${xCol}" as val FROM (${sql}) WHERE "${xCol}" IS NOT NULL ORDER BY val LIMIT 50`);
    const vals = levels.map(r => r.val);
    if (vals.length < 2) { container.innerHTML = ''; return; }
    // Check if the column is numeric
    const sample = await query(`SELECT typeof("${xCol}") as t FROM (${sql}) LIMIT 1`);
    if (sample[0]?.t?.includes('INT') || sample[0]?.t?.includes('FLOAT') || sample[0]?.t?.includes('DOUBLE')) {
      container.innerHTML = ''; return;
    }

    const maxItems = ['unpaired_t','mann_whitney'].includes(test) ? 2 : vals.length;
    const defaultSelected = vals.slice(0, maxItems);

    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Groups</label>
        <div class="multi-select-container" id="stat-groups">
          ${vals.map(v => `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(String(v))}" ${defaultSelected.includes(v) ? 'checked' : ''}> ${escapeHtml(String(v))}</label>`).join('')}
        </div>
      </div>
    `;
  } catch { container.innerHTML = ''; }
}

function getStatsSQL() {
  const useWrangled = $('#stat-use-wrangled')?.checked;
  if (useWrangled && getSteps().length > 0) return buildPipelineSQL();
  return `SELECT * FROM "${getTableName()}"`;
}

function getSelectedGroups() {
  return $$('#stat-groups input:checked').map(cb => cb.value);
}

async function runAnalysis(store) {
  const results = $('#stat-results');
  if (!results) return;

  const test = $('#stat-test')?.value;
  const xCol = $('#stat-x')?.value;
  const yCol = $('#stat-y')?.value;
  if (!test || !xCol || !yCol) {
    results.innerHTML = '<div class="status-error">Please select X, Y, and a test type.</div>';
    return;
  }

  try {
    let sql = getStatsSQL();
    const groups = getSelectedGroups();

    // Filter by groups if applicable
    if (groups.length > 0 && ['anova','kruskal','unpaired_t','mann_whitney'].includes(test)) {
      const inList = groups.map(g => `'${String(g).replace(/'/g, "''")}'`).join(',');
      sql = `SELECT * FROM (${sql}) WHERE "${xCol}" IN (${inList})`;
    }

    const data = await query(sql);
    if (data.length === 0) { results.innerHTML = '<div class="status-error">No data after filtering.</div>'; return; }

    const xVals = data.map(r => r[xCol]);
    const yVals = data.map(r => r[yCol]);
    const xNum = xVals.map(Number).filter(v => !isNaN(v));
    const yNum = yVals.map(Number).filter(v => !isNaN(v));

    let html = '';

    switch (test) {
      case 'lm': html = linearRegression(xVals, yVals, xCol, yCol, data); break;
      case 'anova': html = anova(data, xCol, yCol); break;
      case 'kruskal': html = kruskalWallis(data, xCol, yCol); break;
      case 'paired_t': html = pairedTTest(xNum, yNum, xCol, yCol); break;
      case 'wilcoxon_signed': html = wilcoxonSigned(xNum, yNum, xCol, yCol); break;
      case 'unpaired_t': html = unpairedTTest(data, xCol, yCol); break;
      case 'mann_whitney': html = mannWhitneyU(data, xCol, yCol); break;
      case 'pearson_cor': html = pearsonCorrelation(xNum, yNum, xCol, yCol); break;
      case 'spearman_cor': html = spearmanCorrelation(xNum, yNum, xCol, yCol); break;
      case 'chisq': html = chiSquared(data, xCol, yCol); break;
      default: html = '<div class="status-error">Unsupported test.</div>';
    }

    results.innerHTML = html;
  } catch (err) {
    results.innerHTML = `<div class="status-error">Error: ${escapeHtml(err.message)}</div>`;
    console.error('[Stats]', err);
  }
}

// ── Statistical implementations ──

function linearRegression(xVals, yVals, xCol, yCol, data) {
  let xs = xVals.map(Number);
  let ys = yVals.map(Number);
  // Pair and filter NaN
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
  if (pairs.length < 3) return '<div class="status-error">Need at least 3 valid numeric pairs.</div>';

  xs = pairs.map(p => p[0]);
  ys = pairs.map(p => p[1]);
  const n = xs.length;
  const mx = mean(xs), my = mean(ys);
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);

  const b1 = sxy / sxx;
  const b0 = my - b1 * mx;
  const predicted = xs.map(x => b0 + b1 * x);
  const residuals = ys.map((y, i) => y - predicted[i]);
  const sse = residuals.reduce((a, r) => a + r ** 2, 0);
  const sst = syy;
  const ssr = sst - sse;
  const rSq = sst === 0 ? 0 : 1 - sse / sst;
  const adjRSq = 1 - (1 - rSq) * (n - 1) / (n - 2);
  const mse = sse / (n - 2);
  const sigma = Math.sqrt(mse);
  const seB1 = Math.sqrt(mse / sxx);
  const seB0 = Math.sqrt(mse * (1/n + mx**2 / sxx));
  const tB0 = b0 / seB0, tB1 = b1 / seB1;
  const fStat = (ssr / 1) / mse;
  const pB0 = 2 * tDistPValue(Math.abs(tB0), n - 2);
  const pB1 = 2 * tDistPValue(Math.abs(tB1), n - 2);
  const pF = fDistPValue(fStat, 1, n - 2);
  const tCrit = tInv(0.025, n - 2);

  return `
    <div class="stat-result-card">
      <h4>Model Fit</h4>
      <table class="data-table">
        <thead><tr><th>Metric</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>Observations</td><td class="num">${n}</td></tr>
          <tr><td>R²</td><td class="num">${formatNumber(rSq, 4)}</td></tr>
          <tr><td>Adjusted R²</td><td class="num">${formatNumber(adjRSq, 4)}</td></tr>
          <tr><td>F-statistic</td><td class="num">${formatNumber(fStat)}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(pF)}</td></tr>
          <tr><td>Residual Std. Error</td><td class="num">${formatNumber(sigma)}</td></tr>
        </tbody>
      </table>
      <h4>Coefficients</h4>
      <table class="data-table">
        <thead><tr><th>Term</th><th class="num">Estimate</th><th class="num">Std. Error</th><th class="num">t value</th><th class="num">p value</th><th class="num">95% CI</th></tr></thead>
        <tbody>
          <tr>
            <td>Intercept</td><td class="num">${formatNumber(b0)}</td><td class="num">${formatNumber(seB0)}</td>
            <td class="num">${formatNumber(tB0)}</td><td class="num">${formatPValue(pB0)}</td>
            <td class="num">${formatNumber(b0 - tCrit*seB0)} — ${formatNumber(b0 + tCrit*seB0)}</td>
          </tr>
          <tr>
            <td>${escapeHtml(xCol)}</td><td class="num">${formatNumber(b1)}</td><td class="num">${formatNumber(seB1)}</td>
            <td class="num">${formatNumber(tB1)}</td><td class="num">${formatPValue(pB1)}</td>
            <td class="num">${formatNumber(b1 - tCrit*seB1)} — ${formatNumber(b1 + tCrit*seB1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function anova(data, xCol, yCol) {
  const groups = {};
  data.forEach(r => {
    const g = String(r[xCol]);
    const v = Number(r[yCol]);
    if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
  });
  const gNames = Object.keys(groups);
  if (gNames.length < 2) return '<div class="status-error">Need at least 2 groups.</div>';
  const allVals = gNames.flatMap(g => groups[g]);
  const grandMean = mean(allVals);
  const k = gNames.length;
  const N = allVals.length;

  let ssb = 0, ssw = 0;
  gNames.forEach(g => {
    const gm = mean(groups[g]);
    ssb += groups[g].length * (gm - grandMean) ** 2;
    groups[g].forEach(v => { ssw += (v - gm) ** 2; });
  });
  const dfb = k - 1, dfw = N - k;
  const msb = ssb / dfb, msw = ssw / dfw;
  const fStat = msb / msw;
  const pVal = fDistPValue(fStat, dfb, dfw);

  return `
    <div class="stat-result-card">
      <h4>One-way ANOVA</h4>
      <table class="data-table">
        <thead><tr><th>Source</th><th class="num">df</th><th class="num">Sum Sq</th><th class="num">Mean Sq</th><th class="num">F</th><th class="num">p-value</th></tr></thead>
        <tbody>
          <tr><td>Between</td><td class="num">${dfb}</td><td class="num">${formatNumber(ssb)}</td><td class="num">${formatNumber(msb)}</td><td class="num">${formatNumber(fStat)}</td><td class="num">${formatPValue(pVal)}</td></tr>
          <tr><td>Within</td><td class="num">${dfw}</td><td class="num">${formatNumber(ssw)}</td><td class="num">${formatNumber(msw)}</td><td class="num">—</td><td class="num">—</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${pVal < 0.05 ? '✓ Significant difference between groups (p < 0.05).' : '✗ No significant difference between groups (p ≥ 0.05).'}</p>
    </div>
  `;
}

function kruskalWallis(data, xCol, yCol) {
  const groups = {};
  data.forEach(r => {
    const g = String(r[xCol]);
    const v = Number(r[yCol]);
    if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
  });
  const gNames = Object.keys(groups);
  if (gNames.length < 2) return '<div class="status-error">Need at least 2 groups.</div>';

  // Rank all values
  const all = [];
  gNames.forEach(g => groups[g].forEach(v => all.push({ g, v })));
  all.sort((a, b) => a.v - b.v);
  all.forEach((item, i) => { item.rank = i + 1; });
  // Handle ties
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].v === all[i].v) j++;
    const avgRank = (all[i].rank + all[j-1].rank) / 2;
    for (let k = i; k < j; k++) all[k].rank = avgRank;
    i = j;
  }

  const N = all.length;
  const k = gNames.length;
  let H = 0;
  gNames.forEach(g => {
    const ranks = all.filter(a => a.g === g).map(a => a.rank);
    const ni = ranks.length;
    const Ri = ranks.reduce((a,b) => a+b, 0);
    H += (Ri * Ri) / ni;
  });
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const df = k - 1;
  const pVal = chiSqPValue(H, df);

  return `
    <div class="stat-result-card">
      <h4>Kruskal-Wallis Test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>H statistic</td><td class="num">${formatNumber(H)}</td></tr>
          <tr><td>df</td><td class="num">${df}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(pVal)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${pVal < 0.05 ? '✓ Significant difference between groups.' : '✗ No significant difference.'}</p>
    </div>
  `;
}

function pairedTTest(x, y, xCol, yCol) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return '<div class="status-error">Need at least 2 paired observations.</div>';
  const diffs = x.slice(0, n).map((v, i) => v - y[i]);
  const md = mean(diffs);
  const sd = stddev(diffs);
  const se = sd / Math.sqrt(n);
  const t = md / se;
  const df = n - 1;
  const p = 2 * tDistPValue(Math.abs(t), df);
  const tCrit = tInv(0.025, df);

  return `
    <div class="stat-result-card">
      <h4>Paired t-test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>Mean difference</td><td class="num">${formatNumber(md)}</td></tr>
          <tr><td>t statistic</td><td class="num">${formatNumber(t)}</td></tr>
          <tr><td>df</td><td class="num">${df}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
          <tr><td>95% CI</td><td class="num">${formatNumber(md - tCrit*se)} — ${formatNumber(md + tCrit*se)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? '✓ Significant difference (p < 0.05).' : '✗ No significant difference (p ≥ 0.05).'}</p>
    </div>
  `;
}

function wilcoxonSigned(x, y, xCol, yCol) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return '<div class="status-error">Need at least 2 paired observations.</div>';
  const diffs = x.slice(0, n).map((v, i) => v - y[i]).filter(d => d !== 0);
  if (diffs.length === 0) return '<div class="status-error">All differences are zero.</div>';
  const absDiffs = diffs.map(d => ({ d, abs: Math.abs(d), sign: d > 0 ? 1 : -1 }));
  absDiffs.sort((a, b) => a.abs - b.abs);
  absDiffs.forEach((item, i) => { item.rank = i + 1; });
  // Tie correction
  let i = 0;
  while (i < absDiffs.length) {
    let j = i;
    while (j < absDiffs.length && absDiffs[j].abs === absDiffs[i].abs) j++;
    const avgR = (absDiffs[i].rank + absDiffs[j-1].rank) / 2;
    for (let k = i; k < j; k++) absDiffs[k].rank = avgR;
    i = j;
  }
  const Wplus = absDiffs.filter(d => d.sign > 0).reduce((a, d) => a + d.rank, 0);
  const Wminus = absDiffs.filter(d => d.sign < 0).reduce((a, d) => a + d.rank, 0);
  const W = Math.min(Wplus, Wminus);
  const nn = absDiffs.length;
  const muW = nn * (nn + 1) / 4;
  const sigmaW = Math.sqrt(nn * (nn + 1) * (2 * nn + 1) / 24);
  const z = (W - muW) / sigmaW;
  const p = 2 * normalCDF(-Math.abs(z));

  return `
    <div class="stat-result-card">
      <h4>Wilcoxon Signed-Rank Test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>W statistic</td><td class="num">${formatNumber(W, 0)}</td></tr>
          <tr><td>Z (approx)</td><td class="num">${formatNumber(z)}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? '✓ Significant difference.' : '✗ No significant difference.'}</p>
    </div>
  `;
}

function unpairedTTest(data, xCol, yCol) {
  const groups = {};
  data.forEach(r => {
    const g = String(r[xCol]);
    const v = Number(r[yCol]);
    if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
  });
  const gNames = Object.keys(groups);
  if (gNames.length !== 2) return '<div class="status-error">Need exactly 2 groups.</div>';
  const [a, b] = [groups[gNames[0]], groups[gNames[1]]];
  return welchTTest(a, b, gNames[0], gNames[1]);
}

function welchTTest(a, b, nameA, nameB) {
  const n1 = a.length, n2 = b.length;
  if (n1 < 2 || n2 < 2) return '<div class="status-error">Each group needs ≥ 2 observations.</div>';
  const m1 = mean(a), m2 = mean(b);
  const v1 = variance(a), v2 = variance(b);
  const se = Math.sqrt(v1/n1 + v2/n2);
  const t = (m1 - m2) / se;
  const df = (v1/n1 + v2/n2)**2 / ((v1/n1)**2/(n1-1) + (v2/n2)**2/(n2-1));
  const p = 2 * tDistPValue(Math.abs(t), df);
  const tCrit = tInv(0.025, df);
  const diff = m1 - m2;

  return `
    <div class="stat-result-card">
      <h4>Welch's Two-Sample t-test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>Mean (${escapeHtml(nameA)})</td><td class="num">${formatNumber(m1)}</td></tr>
          <tr><td>Mean (${escapeHtml(nameB)})</td><td class="num">${formatNumber(m2)}</td></tr>
          <tr><td>Difference</td><td class="num">${formatNumber(diff)}</td></tr>
          <tr><td>t statistic</td><td class="num">${formatNumber(t)}</td></tr>
          <tr><td>df</td><td class="num">${formatNumber(df, 1)}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
          <tr><td>95% CI</td><td class="num">${formatNumber(diff - tCrit*se)} — ${formatNumber(diff + tCrit*se)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? '✓ Significant difference.' : '✗ No significant difference.'}</p>
    </div>
  `;
}

function mannWhitneyU(data, xCol, yCol) {
  const groups = {};
  data.forEach(r => {
    const g = String(r[xCol]);
    const v = Number(r[yCol]);
    if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
  });
  const gNames = Object.keys(groups);
  if (gNames.length !== 2) return '<div class="status-error">Need exactly 2 groups.</div>';
  const [a, b] = [groups[gNames[0]], groups[gNames[1]]];
  const n1 = a.length, n2 = b.length;
  // Rank all
  const all = [...a.map(v => ({ g: 0, v })), ...b.map(v => ({ g: 1, v }))].sort((x, y) => x.v - y.v);
  all.forEach((item, i) => { item.rank = i + 1; });
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].v === all[i].v) j++;
    const avgR = (all[i].rank + all[j-1].rank) / 2;
    for (let k = i; k < j; k++) all[k].rank = avgR;
    i = j;
  }
  const R1 = all.filter(x => x.g === 0).reduce((s, x) => s + x.rank, 0);
  const U1 = R1 - n1*(n1+1)/2;
  const U2 = n1*n2 - U1;
  const U = Math.min(U1, U2);
  const muU = n1*n2/2;
  const sigmaU = Math.sqrt(n1*n2*(n1+n2+1)/12);
  const z = (U - muU) / sigmaU;
  const p = 2 * normalCDF(-Math.abs(z));

  return `
    <div class="stat-result-card">
      <h4>Mann-Whitney U Test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>U statistic</td><td class="num">${formatNumber(U, 0)}</td></tr>
          <tr><td>Z (approx)</td><td class="num">${formatNumber(z)}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? '✓ Significant difference.' : '✗ No significant difference.'}</p>
    </div>
  `;
}

function pearsonCorrelation(x, y, xCol, yCol) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return '<div class="status-error">Need at least 3 observations.</div>';
  const xs = x.slice(0, n), ys = y.slice(0, n);
  const r = pearsonR(xs, ys);
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  const p = 2 * tDistPValue(Math.abs(t), df);
  const tCrit = tInv(0.025, df);
  // Fisher z transform for CI
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const seZ = 1 / Math.sqrt(n - 3);
  const zLo = z - 1.96 * seZ, zHi = z + 1.96 * seZ;
  const rLo = (Math.exp(2*zLo) - 1) / (Math.exp(2*zLo) + 1);
  const rHi = (Math.exp(2*zHi) - 1) / (Math.exp(2*zHi) + 1);

  return `
    <div class="stat-result-card">
      <h4>Pearson Correlation</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>r</td><td class="num">${formatNumber(r, 4)}</td></tr>
          <tr><td>t statistic</td><td class="num">${formatNumber(t)}</td></tr>
          <tr><td>df</td><td class="num">${df}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
          <tr><td>95% CI</td><td class="num">${formatNumber(rLo, 4)} — ${formatNumber(rHi, 4)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? `✓ Significant correlation (r = ${formatNumber(r, 3)}).` : '✗ No significant correlation.'}</p>
    </div>
  `;
}

function spearmanCorrelation(x, y, xCol, yCol) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return '<div class="status-error">Need at least 3 observations.</div>';
  const xs = x.slice(0, n), ys = y.slice(0, n);
  const rx = ranks(xs), ry = ranks(ys);
  const rho = pearsonR(rx, ry);
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  const df = n - 2;
  const p = 2 * tDistPValue(Math.abs(t), df);

  return `
    <div class="stat-result-card">
      <h4>Spearman Correlation</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>ρ (rho)</td><td class="num">${formatNumber(rho, 4)}</td></tr>
          <tr><td>t statistic</td><td class="num">${formatNumber(t)}</td></tr>
          <tr><td>df</td><td class="num">${df}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? `✓ Significant rank correlation.` : '✗ No significant rank correlation.'}</p>
    </div>
  `;
}

function chiSquared(data, xCol, yCol) {
  const table = {};
  const xLevels = new Set(), yLevels = new Set();
  data.forEach(r => {
    const x = String(r[xCol]), y = String(r[yCol]);
    xLevels.add(x); yLevels.add(y);
    if (!table[x]) table[x] = {};
    table[x][y] = (table[x][y] || 0) + 1;
  });
  const xl = [...xLevels], yl = [...yLevels];
  if (xl.length < 2 || yl.length < 2) return '<div class="status-error">Need at least 2 levels in each variable.</div>';

  const N = data.length;
  const rowTotals = xl.map(x => yl.reduce((s, y) => s + (table[x]?.[y] || 0), 0));
  const colTotals = yl.map(y => xl.reduce((s, x) => s + (table[x]?.[y] || 0), 0));
  let chi2 = 0;
  xl.forEach((x, i) => {
    yl.forEach((y, j) => {
      const obs = table[x]?.[y] || 0;
      const exp = (rowTotals[i] * colTotals[j]) / N;
      if (exp > 0) chi2 += (obs - exp) ** 2 / exp;
    });
  });
  const df = (xl.length - 1) * (yl.length - 1);
  const p = chiSqPValue(chi2, df);

  return `
    <div class="stat-result-card">
      <h4>Chi-squared Test</h4>
      <table class="data-table">
        <thead><tr><th>Statistic</th><th class="num">Value</th></tr></thead>
        <tbody>
          <tr><td>χ² statistic</td><td class="num">${formatNumber(chi2)}</td></tr>
          <tr><td>df</td><td class="num">${df}</td></tr>
          <tr><td>p-value</td><td class="num">${formatPValue(p)}</td></tr>
        </tbody>
      </table>
      <p class="stat-interpretation">${p < 0.05 ? '✓ Significant association between variables.' : '✗ No significant association.'}</p>
    </div>
  `;
}

// ── Math helpers ──

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function variance(arr) { const m = mean(arr); return arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1); }
function stddev(arr) { return Math.sqrt(variance(arr)); }
function pearsonR(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i]-mx)*(y[i]-my); sxx += (x[i]-mx)**2; syy += (y[i]-my)**2; }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}
function ranks(arr) {
  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgR = (i + j + 1) / 2;
    for (let k = i; k < j; k++) r[indexed[k].i] = avgR;
    i = j;
  }
  return r;
}

// ── Distribution functions (approximations) ──

function normalCDF(z) {
  // Horner form of the rational approximation
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-z*z);
  return 0.5 * (1 + sign * y);
}

function tDistPValue(t, df) {
  // Approximation using incomplete beta function
  const x = df / (df + t * t);
  return 0.5 * incompleteBeta(x, df / 2, 0.5);
}

function tInv(p, df) {
  // Newton's method approximation for t-distribution quantile
  // Start with normal approximation
  let t = normalInv(p);
  for (let i = 0; i < 10; i++) {
    const cdf = tDistPValue(Math.abs(t), df);
    const target = p;
    // Adjust
    const pdf = tDistPDF(t, df);
    if (Math.abs(pdf) < 1e-15) break;
    t -= (cdf - target) / pdf;
  }
  return Math.abs(t);
}

function normalInv(p) {
  // Rational approximation for inverse normal
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

function tDistPDF(t, df) {
  const coeff = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI);
  return coeff * Math.pow(1 + t * t / df, -(df + 1) / 2);
}

function fDistPValue(f, df1, df2) {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return incompleteBeta(x, df2 / 2, df1 / 2);
}

function chiSqPValue(x, df) {
  if (x <= 0) return 1;
  return 1 - lowerIncompleteGamma(df / 2, x / 2) / gamma(df / 2);
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Continued fraction
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  // Lentz's algorithm
  let f = 1, c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; f = d;
  for (let i = 1; i <= 200; i++) {
    const m = i, m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c; f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return front * f;
}

function lnGamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function gamma(z) { return Math.exp(lnGamma(z)); }

function lowerIncompleteGamma(s, x) {
  if (x < 0) return 0;
  if (x === 0) return 0;
  // Series expansion
  let sum = 0, term = 1 / s;
  for (let n = 1; n < 300; n++) {
    sum += term;
    term *= x / (s + n);
    if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
  }
  sum += term;
  return Math.exp(-x + s * Math.log(x) - lnGamma(s)) * sum;
}
