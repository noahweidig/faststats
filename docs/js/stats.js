/* ── FastStats · stats.js ── Statistical analysis ── */
import { getRows, getSchema } from './engine.js';
import { getTableName } from './data.js';
import { getWrangledFrame, getSteps } from './wrangle.js';
import { $, $$, el, escapeHtml, formatNumber, formatPValue, showToast } from './utils.js';
import { composeResult, renderResultInto } from './report.js';

/* Rows for analysis: wrangled frame when requested, else the active table. */
function getStatsData() {
  const useWrangled = $('#stat-use-wrangled')?.checked;
  if (useWrangled && getSteps().length > 0) return getWrangledFrame().rows;
  return getRows(getTableName());
}
function getStatsSchema() {
  const useWrangled = $('#stat-use-wrangled')?.checked;
  if (useWrangled && getSteps().length > 0) return getWrangledFrame().cols;
  return getSchema(getTableName());
}

const TESTS = [
  ['descriptive', 'Descriptive statistics'],
  ['normality', 'Normality (D’Agostino–Pearson)'],
  ['one_sample_t', 'One-sample t-test'],
  ['unpaired_t', 'Two-sample t-test (Welch)'],
  ['paired_t', 'Paired t-test'],
  ['anova', 'One-way ANOVA + Tukey HSD'],
  ['kruskal', 'Kruskal-Wallis'],
  ['mann_whitney', 'Mann-Whitney U'],
  ['wilcoxon_signed', 'Wilcoxon Signed-Rank'],
  ['levene', 'Levene (equal variance)'],
  ['f_var', 'F-test (two variances)'],
  ['pearson_cor', 'Pearson Correlation'],
  ['spearman_cor', 'Spearman Correlation'],
  ['corr_matrix', 'Correlation matrix'],
  ['lm', 'Linear Regression'],
  ['mlr', 'Multiple Regression'],
  ['logistic', 'Logistic Regression'],
  ['chisq', 'Chi-squared Test'],
  ['fisher', 'Fisher Exact (2×2)'],
  ['prop_two', 'Two-proportion z-test'],
];

// Which selectors each test needs
const GROUP_TESTS = new Set(['anova', 'kruskal', 'unpaired_t', 'mann_whitney', 'levene', 'f_var']);
const XY_NUM = new Set(['lm', 'pearson_cor', 'spearman_cor', 'paired_t', 'wilcoxon_signed']);
const CAT_TESTS = new Set(['chisq', 'fisher', 'prop_two']);
const MULTI = new Set(['mlr', 'logistic']);
const Y_ONLY = new Set(['descriptive', 'normality', 'one_sample_t', 'corr_matrix']);

export async function renderStats(store) {
  const container = $('#tab-stats');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded.</p></div>'; return; }

  const schema = getStatsSchema();
  const allCols = schema.map(s => s.name);

  container.innerHTML = `
    <div class="stats-layout">
      <div class="stats-sidebar">
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="stat-use-wrangled"> Use wrangled data</label>
        </div>
        <div class="form-group">
          <label class="form-label">Analysis</label>
          <select id="stat-test" class="form-select">
            ${TESTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div id="stat-x-group" class="form-group">
          <label class="form-label" id="stat-x-label">Predictor / grouping (X)</label>
          <select id="stat-x" class="form-select"><option value="">— none —</option>${allCols.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
        </div>
        <div id="stat-y-group" class="form-group">
          <label class="form-label" id="stat-y-label">Response / value (Y)</label>
          <select id="stat-y" class="form-select"><option value="">— none —</option>${allCols.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
        </div>
        <div id="stat-extra"></div>
        <div id="stat-group-container"></div>
        <button id="stat-run" class="btn btn-primary" style="width:100%;margin-top:.5rem">Run analysis</button>
        <button id="stat-report" class="btn btn-secondary btn-sm" style="width:100%;margin-top:.4rem" title="Send latest result to the Report tab">Add all results to report</button>
      </div>
      <div class="stats-main">
        <div class="stats-main-head">
          <h3 class="section-title" style="margin:0">Results</h3>
          <div class="stats-main-tools">
            <button id="stat-copy-all" class="btn btn-ghost btn-xs">Copy all</button>
            <button id="stat-clear" class="btn btn-ghost btn-xs">Clear</button>
          </div>
        </div>
        <div id="stat-results">
          <div class="empty-state"><p>Configure your analysis and click <strong>Run analysis</strong>. Results stack here — copy any as text/Markdown or push to the report.</p></div>
        </div>
      </div>
    </div>
  `;

  $('#stat-run')?.addEventListener('click', () => runAnalysis(store));
  $('#stat-test')?.addEventListener('change', () => { updateSelectorUI(store); });
  $('#stat-x')?.addEventListener('change', () => updateGroupUI(store));
  $('#stat-clear')?.addEventListener('click', () => { lastResults.length = 0; $('#stat-results').innerHTML = '<div class="empty-state"><p>Cleared.</p></div>'; });
  $('#stat-copy-all')?.addEventListener('click', async () => {
    if (!lastResults.length) return showToast('No results yet', 'error');
    const { copyToClipboard } = await import('./utils.js');
    await copyToClipboard(lastResults.map(r => r.text).join('\n\n'));
    showToast('All results copied');
  });
  $('#stat-report')?.addEventListener('click', async () => {
    if (!lastResults.length) return showToast('No results yet', 'error');
    const { addReportItem } = await import('./report.js');
    lastResults.forEach(r => addReportItem({ kind: 'stat', title: r.title, html: r.html, text: r.text, md: r.md }));
  });

  updateSelectorUI(store);
}

const lastResults = [];

function updateSelectorUI(store) {
  const test = $('#stat-test')?.value;
  const xGroup = $('#stat-x-group'), yGroup = $('#stat-y-group');
  const xLabel = $('#stat-x-label'), yLabel = $('#stat-y-label');
  const extra = $('#stat-extra');
  if (extra) extra.innerHTML = '';
  if (!xGroup || !yGroup) return;

  const isCorr = test === 'corr_matrix';
  xGroup.style.display = (isCorr || (Y_ONLY.has(test) && test !== 'descriptive')) ? 'none' : 'block';
  yGroup.style.display = isCorr ? 'none' : 'block';

  // Relabel
  if (GROUP_TESTS.has(test)) { xLabel.textContent = 'Grouping variable (X)'; yLabel.textContent = 'Numeric value (Y)'; }
  else if (XY_NUM.has(test)) { xLabel.textContent = 'X (numeric)'; yLabel.textContent = 'Y (numeric)'; }
  else if (CAT_TESTS.has(test)) { xLabel.textContent = 'Variable 1 (X)'; yLabel.textContent = 'Variable 2 (Y)'; }
  else if (test === 'descriptive') { xLabel.textContent = 'Group by (optional)'; yLabel.textContent = 'Numeric variable (Y)'; }
  else if (test === 'normality') { yLabel.textContent = 'Numeric variable (Y)'; }
  else if (test === 'one_sample_t') { yLabel.textContent = 'Numeric variable (Y)'; }
  else if (MULTI.has(test)) { yLabel.textContent = test === 'logistic' ? 'Binary response (Y)' : 'Response (Y, numeric)'; }

  // Extra controls
  const schema = getStatsSchema();
  const numCols = schema.filter(s => s.isNumeric).map(s => s.name);
  if (test === 'one_sample_t') {
    extra.innerHTML = `<div class="form-group"><label class="form-label">Null mean (μ₀)</label><input type="number" id="stat-mu" class="form-input" value="0" step="any"></div>`;
  } else if (MULTI.has(test)) {
    extra.innerHTML = `<div class="form-group"><label class="form-label">Predictors (numeric)</label>
      <div class="multi-select-container" id="stat-predictors">
        ${numCols.map(c => `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(c)}"> ${escapeHtml(c)}</label>`).join('')}
      </div></div>`;
  } else if (test === 'corr_matrix') {
    extra.innerHTML = `<div class="form-group"><label class="form-label">Numeric columns</label>
      <div class="multi-select-container" id="stat-corr-cols">
        ${numCols.map(c => `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(c)}" checked> ${escapeHtml(c)}</label>`).join('')}
      </div>
      <label class="form-label" style="margin-top:.4rem">Method</label>
      <select id="stat-corr-method" class="form-select"><option value="pearson">Pearson</option><option value="spearman">Spearman</option></select>
      </div>`;
  }
  updateGroupUI(store);
}

function updateGroupUI(store) {
  const container = $('#stat-group-container');
  if (!container) return;
  const test = $('#stat-test')?.value;
  const xCol = $('#stat-x')?.value;
  if (!GROUP_TESTS.has(test) || !xCol) { container.innerHTML = ''; return; }

  try {
    const rows = getStatsData();
    const firstVal = rows.find(r => r[xCol] != null)?.[xCol];
    if (typeof firstVal === 'number') { container.innerHTML = ''; return; }
    const seen = new Set();
    for (const r of rows) { if (r[xCol] != null) seen.add(r[xCol]); if (seen.size > 50) break; }
    const vals = [...seen].sort((a, b) => String(a).localeCompare(String(b)));
    if (vals.length < 2) { container.innerHTML = ''; return; }
    const maxItems = ['unpaired_t', 'mann_whitney', 'f_var'].includes(test) ? 2 : vals.length;
    const defaultSelected = vals.slice(0, maxItems);
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Groups to compare</label>
        <div class="multi-select-container" id="stat-groups">
          ${vals.map(v => `<label class="multi-select-option"><input type="checkbox" value="${escapeHtml(String(v))}" ${defaultSelected.includes(v) ? 'checked' : ''}> ${escapeHtml(String(v))}</label>`).join('')}
        </div>
      </div>`;
  } catch { container.innerHTML = ''; }
}

function getSelectedGroups() { return $$('#stat-groups input:checked').map(cb => cb.value); }
function getMulti(sel) { return $$(`${sel} input:checked`).map(cb => cb.value); }

function runAnalysis(store) {
  const results = $('#stat-results');
  if (!results) return;
  const test = $('#stat-test')?.value;
  const xCol = $('#stat-x')?.value || '';
  const yCol = $('#stat-y')?.value || '';

  try {
    let data = getStatsData();
    if (GROUP_TESTS.has(test)) {
      const groups = getSelectedGroups();
      if (groups.length) { const set = new Set(groups.map(String)); data = data.filter(r => set.has(String(r[xCol]))); }
    }
    if (!data.length) { flash(results, 'No data after filtering.'); return; }

    const res = dispatch(test, data, xCol, yCol);
    if (!res) return;
    if (res.error) { flash(results, res.error); return; }

    // Clear empty-state on first result
    if (!lastResults.length) results.innerHTML = '';
    lastResults.push(res);
    const node = renderResultInto(results, res, { kind: 'stat' });
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    flash(results, 'Error: ' + err.message);
    console.error('[Stats]', err);
  }
}

function flash(container, msg) {
  const d = el('div', { className: 'status-error' }, msg);
  if (!lastResults.length) { container.innerHTML = ''; }
  container.append(d);
  setTimeout(() => d.remove(), 6000);
}

function dispatch(test, data, xCol, yCol) {
  const need = (...cols) => cols.every(Boolean);
  switch (test) {
    case 'descriptive': return descriptive(data, yCol, xCol);
    case 'normality': return normality(data, yCol);
    case 'one_sample_t': return oneSampleT(data, yCol, parseFloat($('#stat-mu')?.value || '0'));
    case 'unpaired_t': return need(xCol, yCol) ? unpairedT(data, xCol, yCol) : miss();
    case 'paired_t': return need(xCol, yCol) ? pairedT(data, xCol, yCol) : miss();
    case 'anova': return need(xCol, yCol) ? anova(data, xCol, yCol) : miss();
    case 'kruskal': return need(xCol, yCol) ? kruskal(data, xCol, yCol) : miss();
    case 'mann_whitney': return need(xCol, yCol) ? mannWhitney(data, xCol, yCol) : miss();
    case 'wilcoxon_signed': return need(xCol, yCol) ? wilcoxon(data, xCol, yCol) : miss();
    case 'levene': return need(xCol, yCol) ? levene(data, xCol, yCol) : miss();
    case 'f_var': return need(xCol, yCol) ? fVar(data, xCol, yCol) : miss();
    case 'pearson_cor': return need(xCol, yCol) ? correlation(data, xCol, yCol, 'pearson') : miss();
    case 'spearman_cor': return need(xCol, yCol) ? correlation(data, xCol, yCol, 'spearman') : miss();
    case 'corr_matrix': return corrMatrix(data);
    case 'lm': return need(xCol, yCol) ? multipleRegression(data, yCol, [xCol]) : miss();
    case 'mlr': return multipleRegression(data, yCol, getMulti('#stat-predictors'));
    case 'logistic': return logistic(data, yCol, getMulti('#stat-predictors'));
    case 'chisq': return need(xCol, yCol) ? chiSquared(data, xCol, yCol) : miss();
    case 'fisher': return need(xCol, yCol) ? fisherExact(data, xCol, yCol) : miss();
    case 'prop_two': return need(xCol, yCol) ? twoProportion(data, xCol, yCol) : miss();
    default: return { error: 'Unsupported test.' };
  }
}
function miss() { return { error: 'Please select the required X / Y variables.' }; }

/* ── helpers to pull numeric vectors ── */
function numVec(data, col) { return data.map(r => Number(r[col])).filter(v => !isNaN(v)); }
function pairNum(data, xc, yc) {
  const xs = [], ys = [];
  for (const r of data) { const x = Number(r[xc]), y = Number(r[yc]); if (!isNaN(x) && !isNaN(y)) { xs.push(x); ys.push(y); } }
  return [xs, ys];
}
function groupNumeric(data, xCol, yCol) {
  const g = {};
  for (const r of data) { const k = String(r[xCol]); const v = Number(r[yCol]); if (!isNaN(v) && r[xCol] != null) { (g[k] ||= []).push(v); } }
  return g;
}

/* ═══════════ Tests ═══════════ */

function descriptive(data, yCol, groupCol) {
  if (!yCol) return miss();
  const head = ['Group', 'n', 'Mean', 'SD', 'SE', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'Skew'];
  const rows = [];
  const build = (label, v) => {
    if (!v.length) return;
    const m = mean(v), sd = stddev(v);
    rows.push([label, v.length, f(m), f(sd), f(sd / Math.sqrt(v.length)), f(Math.min(...v)),
      f(quantile(v, .25)), f(quantile(v, .5)), f(quantile(v, .75)), f(Math.max(...v)), f(skewness(v))]);
  };
  if (groupCol) {
    const g = groupNumeric(data, groupCol, yCol);
    Object.keys(g).sort().forEach(k => build(k, g[k]));
  } else build('all', numVec(data, yCol));
  if (!rows.length) return { error: 'No numeric data in the chosen column.' };
  return composeResult({ title: `Descriptive statistics — ${yCol}`, tables: [{ head, rows }] });
}

function normality(data, yCol) {
  if (!yCol) return miss();
  const v = numVec(data, yCol);
  const n = v.length;
  if (n < 8) return { error: 'Need at least 8 numeric observations.' };
  const g1 = skewness(v), g2 = kurtosisExcess(v);
  // D'Agostino skewness Z
  const Y = g1 * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2)));
  const b2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const W2 = -1 + Math.sqrt(2 * (b2 - 1));
  const del = 1 / Math.sqrt(0.5 * Math.log(W2));
  const alpha = Math.sqrt(2 / (W2 - 1));
  const Zg1 = del * Math.log(Y / alpha + Math.sqrt((Y / alpha) ** 2 + 1));
  // Anscombe kurtosis Z
  const E = 3 * (n - 1) / (n + 1);
  const varK = 24 * n * (n - 2) * (n - 3) / ((n + 1) ** 2 * (n + 3) * (n + 5));
  const x = (g2 + 3 - E) / Math.sqrt(varK);
  const beta = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9)) * Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3)));
  const A = 6 + 8 / beta * (2 / beta + Math.sqrt(1 + 4 / (beta * beta)));
  const Zg2 = ((1 - 2 / (9 * A)) - Math.cbrt((1 - 2 / A) / (1 + x * Math.sqrt(2 / (A - 4))))) / Math.sqrt(2 / (9 * A));
  const K2 = Zg1 * Zg1 + Zg2 * Zg2;
  const p = chiSqPValue(K2, 2);
  return composeResult({
    title: `Normality test — ${yCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      ['n', n], ['Skewness', f(g1)], ['Excess kurtosis', f(g2)],
      ['K² (omnibus)', f(K2)], ['p-value', formatPValue(p)],
    ] }],
    interp: p < 0.05 ? 'Departs from normality (p < 0.05).' : 'Consistent with a normal distribution (p ≥ 0.05).'
  });
}

function oneSampleT(data, yCol, mu) {
  if (!yCol) return miss();
  const v = numVec(data, yCol);
  const n = v.length;
  if (n < 2) return { error: 'Need at least 2 observations.' };
  const m = mean(v), sd = stddev(v), se = sd / Math.sqrt(n);
  const t = (m - mu) / se, df = n - 1;
  const p = 2 * tDistPValue(Math.abs(t), df);
  const tc = tInv(0.025, df);
  return composeResult({
    title: `One-sample t-test — ${yCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      ['n', n], ['Mean', f(m)], ['μ₀', f(mu)], ['t', f(t)], ['df', df],
      ['p-value', formatPValue(p)], ['95% CI', `${f(m - tc * se)} — ${f(m + tc * se)}`],
      ["Cohen's d", f((m - mu) / sd)],
    ] }],
    interp: p < 0.05 ? `Mean differs from ${f(mu)} (p < 0.05).` : `No significant difference from ${f(mu)}.`
  });
}

function unpairedT(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g);
  if (names.length !== 2) return { error: `Need exactly 2 groups (got ${names.length}). Select 2 in "Groups to compare".` };
  const [a, b] = [g[names[0]], g[names[1]]];
  if (a.length < 2 || b.length < 2) return { error: 'Each group needs ≥ 2 observations.' };
  const m1 = mean(a), m2 = mean(b), v1 = variance(a), v2 = variance(b), n1 = a.length, n2 = b.length;
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = 2 * tDistPValue(Math.abs(t), df);
  const tc = tInv(0.025, df), diff = m1 - m2;
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const d = diff / sp;
  return composeResult({
    title: `Welch two-sample t-test — ${yCol} by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      [`Mean (${names[0]})`, f(m1)], [`Mean (${names[1]})`, f(m2)], ['Difference', f(diff)],
      ['t', f(t)], ['df', f(df, 1)], ['p-value', formatPValue(p)],
      ['95% CI (diff)', `${f(diff - tc * se)} — ${f(diff + tc * se)}`], ["Cohen's d", f(d)],
    ] }],
    interp: p < 0.05 ? 'Significant difference between groups (p < 0.05).' : 'No significant difference (p ≥ 0.05).'
  });
}

function pairedT(data, xCol, yCol) {
  const [x, y] = pairNum(data, xCol, yCol);
  const n = Math.min(x.length, y.length);
  if (n < 2) return { error: 'Need at least 2 paired observations.' };
  const diffs = x.slice(0, n).map((v, i) => v - y[i]);
  const md = mean(diffs), sd = stddev(diffs), se = sd / Math.sqrt(n), t = md / se, df = n - 1;
  const p = 2 * tDistPValue(Math.abs(t), df), tc = tInv(0.025, df);
  return composeResult({
    title: `Paired t-test — ${xCol} vs ${yCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      ['n pairs', n], ['Mean difference', f(md)], ['t', f(t)], ['df', df],
      ['p-value', formatPValue(p)], ['95% CI', `${f(md - tc * se)} — ${f(md + tc * se)}`], ["Cohen's dz", f(md / sd)],
    ] }],
    interp: p < 0.05 ? 'Significant difference (p < 0.05).' : 'No significant difference (p ≥ 0.05).'
  });
}

function anova(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g).sort();
  if (names.length < 2) return { error: 'Need at least 2 groups.' };
  const all = names.flatMap(k => g[k]);
  const gm = mean(all), k = names.length, N = all.length;
  let ssb = 0, ssw = 0;
  names.forEach(nm => { const m = mean(g[nm]); ssb += g[nm].length * (m - gm) ** 2; g[nm].forEach(v => ssw += (v - m) ** 2); });
  const dfb = k - 1, dfw = N - k, msb = ssb / dfb, msw = ssw / dfw, F = msb / msw;
  const p = fDistPValue(F, dfb, dfw);
  const eta2 = ssb / (ssb + ssw);
  const omega2 = (ssb - dfb * msw) / (ssb + ssw + msw);

  const tables = [{
    caption: 'ANOVA table', head: ['Source', 'df', 'Sum Sq', 'Mean Sq', 'F', 'p'],
    rows: [['Between', dfb, f(ssb), f(msb), f(F), formatPValue(p)], ['Within', dfw, f(ssw), f(msw), '—', '—']]
  }, {
    caption: 'Effect size', head: ['Measure', 'Value'], rows: [['η² (eta²)', f(eta2)], ['ω² (omega²)', f(omega2)]]
  }];

  // Tukey HSD (only if significant-ish and reasonable group count)
  if (k <= 12) {
    const qcrit = tukeyQ(0.05, k, dfw);
    const hsdRows = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const a = g[names[i]], b = g[names[j]];
      const diff = mean(a) - mean(b);
      const se = Math.sqrt(msw / 2 * (1 / a.length + 1 / b.length));
      const q = Math.abs(diff) / se;
      const pTukey = tukeyPValue(q, k, dfw);
      const half = qcrit * se;
      hsdRows.push([`${names[i]} − ${names[j]}`, f(diff), `${f(diff - half)} — ${f(diff + half)}`, f(q), formatPValue(pTukey), pTukey < 0.05 ? 'Yes' : '']);
    }
    tables.push({ caption: 'Tukey HSD (pairwise, family-wise α=0.05)', head: ['Comparison', 'Diff', '95% CI', 'q', 'p', 'Sig'], rows: hsdRows });
  }

  return composeResult({
    title: `One-way ANOVA — ${yCol} by ${xCol}`, tables,
    interp: p < 0.05 ? 'Significant difference between groups (p < 0.05). See Tukey HSD for which pairs differ.' : 'No significant difference between groups (p ≥ 0.05).'
  });
}

function kruskal(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g).sort();
  if (names.length < 2) return { error: 'Need at least 2 groups.' };
  const all = [];
  names.forEach(nm => g[nm].forEach(v => all.push({ g: nm, v })));
  rankInPlace(all);
  const N = all.length, k = names.length;
  let H = 0;
  names.forEach(nm => { const rs = all.filter(a => a.g === nm).map(a => a.rank); H += (rs.reduce((a, b) => a + b, 0) ** 2) / rs.length; });
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  // tie correction
  const ties = tieGroups(all.map(a => a.v));
  const C = 1 - ties.reduce((s, t) => s + t ** 3 - t, 0) / (N ** 3 - N);
  if (C > 0) H /= C;
  const df = k - 1, p = chiSqPValue(H, df);
  return composeResult({
    title: `Kruskal-Wallis — ${yCol} by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [['H', f(H)], ['df', df], ['p-value', formatPValue(p)]] }],
    interp: p < 0.05 ? 'Significant difference between groups.' : 'No significant difference.'
  });
}

function mannWhitney(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g);
  if (names.length !== 2) return { error: `Need exactly 2 groups (got ${names.length}).` };
  const a = g[names[0]], b = g[names[1]], n1 = a.length, n2 = b.length;
  const all = [...a.map(v => ({ g: 0, v })), ...b.map(v => ({ g: 1, v }))];
  rankInPlace(all);
  const R1 = all.filter(x => x.g === 0).reduce((s, x) => s + x.rank, 0);
  const U1 = R1 - n1 * (n1 + 1) / 2, U2 = n1 * n2 - U1, U = Math.min(U1, U2);
  const mu = n1 * n2 / 2, sig = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
  const z = (U - mu) / sig, p = 2 * normalCDF(-Math.abs(z));
  const rrb = 1 - 2 * U / (n1 * n2); // rank-biserial
  return composeResult({
    title: `Mann-Whitney U — ${yCol} by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [['U', f(U, 0)], ['Z', f(z)], ['p-value', formatPValue(p)], ['Rank-biserial r', f(rrb)]] }],
    interp: p < 0.05 ? 'Significant difference.' : 'No significant difference.'
  });
}

function wilcoxon(data, xCol, yCol) {
  const [x, y] = pairNum(data, xCol, yCol);
  const n = Math.min(x.length, y.length);
  if (n < 2) return { error: 'Need at least 2 paired observations.' };
  let diffs = x.slice(0, n).map((v, i) => v - y[i]).filter(d => d !== 0);
  if (!diffs.length) return { error: 'All differences are zero.' };
  const items = diffs.map(d => ({ v: Math.abs(d), sign: Math.sign(d) }));
  rankInPlace(items);
  const Wp = items.filter(i => i.sign > 0).reduce((a, i) => a + i.rank, 0);
  const Wm = items.filter(i => i.sign < 0).reduce((a, i) => a + i.rank, 0);
  const W = Math.min(Wp, Wm), nn = items.length;
  const mu = nn * (nn + 1) / 4, sig = Math.sqrt(nn * (nn + 1) * (2 * nn + 1) / 24);
  const z = (W - mu) / sig, p = 2 * normalCDF(-Math.abs(z));
  return composeResult({
    title: `Wilcoxon signed-rank — ${xCol} vs ${yCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [['W', f(W, 0)], ['Z', f(z)], ['p-value', formatPValue(p)]] }],
    interp: p < 0.05 ? 'Significant difference.' : 'No significant difference.'
  });
}

function levene(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g).sort();
  if (names.length < 2) return { error: 'Need at least 2 groups.' };
  // Brown-Forsythe (median-based)
  const z = {};
  names.forEach(nm => { const med = quantile(g[nm], .5); z[nm] = g[nm].map(v => Math.abs(v - med)); });
  const all = names.flatMap(nm => z[nm]);
  const zbar = mean(all), N = all.length, k = names.length;
  let num = 0, den = 0;
  names.forEach(nm => { const zi = mean(z[nm]); num += z[nm].length * (zi - zbar) ** 2; z[nm].forEach(v => den += (v - zi) ** 2); });
  const W = ((N - k) / (k - 1)) * (num / den);
  const p = fDistPValue(W, k - 1, N - k);
  return composeResult({
    title: `Levene (Brown-Forsythe) — ${yCol} by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [['W', f(W)], ['df', `${k - 1}, ${N - k}`], ['p-value', formatPValue(p)]] }],
    interp: p < 0.05 ? 'Variances differ across groups (p < 0.05).' : 'Equal-variance assumption holds (p ≥ 0.05).'
  });
}

function fVar(data, xCol, yCol) {
  const g = groupNumeric(data, xCol, yCol);
  const names = Object.keys(g);
  if (names.length !== 2) return { error: `Need exactly 2 groups (got ${names.length}).` };
  const v1 = variance(g[names[0]]), v2 = variance(g[names[1]]);
  const n1 = g[names[0]].length, n2 = g[names[1]].length;
  let F, d1, d2;
  if (v1 >= v2) { F = v1 / v2; d1 = n1 - 1; d2 = n2 - 1; } else { F = v2 / v1; d1 = n2 - 1; d2 = n1 - 1; }
  const p = 2 * Math.min(fDistPValue(F, d1, d2), 1 - fDistPValue(F, d1, d2));
  return composeResult({
    title: `F-test for equal variances — ${yCol} by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      [`Var (${names[0]})`, f(v1)], [`Var (${names[1]})`, f(v2)], ['F', f(F)], ['df', `${d1}, ${d2}`], ['p-value', formatPValue(Math.min(p, 1))],
    ] }],
    interp: p < 0.05 ? 'Variances differ (p < 0.05).' : 'Variances not significantly different.'
  });
}

function correlation(data, xCol, yCol, method) {
  let [x, y] = pairNum(data, xCol, yCol);
  const n = x.length;
  if (n < 3) return { error: 'Need at least 3 paired observations.' };
  let r;
  if (method === 'spearman') { r = pearsonR(ranks(x), ranks(y)); } else { r = pearsonR(x, y); }
  const t = r * Math.sqrt((n - 2) / (1 - r * r)), df = n - 2;
  const p = 2 * tDistPValue(Math.abs(t), df);
  const rows = [[method === 'spearman' ? 'ρ (rho)' : 'r', f(r, 4)], ['t', f(t)], ['df', df], ['p-value', formatPValue(p)]];
  if (method === 'pearson') {
    const z = 0.5 * Math.log((1 + r) / (1 - r)), se = 1 / Math.sqrt(n - 3);
    const lo = Math.tanh(z - 1.96 * se), hi = Math.tanh(z + 1.96 * se);
    rows.push(['95% CI', `${f(lo, 4)} — ${f(hi, 4)}`], ['R²', f(r * r, 4)]);
  }
  return composeResult({
    title: `${method === 'spearman' ? 'Spearman' : 'Pearson'} correlation — ${xCol} vs ${yCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows }],
    interp: p < 0.05 ? `Significant correlation (r = ${f(r, 3)}).` : 'No significant correlation.'
  });
}

function corrMatrix(data) {
  const cols = getMulti('#stat-corr-cols');
  const method = $('#stat-corr-method')?.value || 'pearson';
  if (cols.length < 2) return { error: 'Select at least 2 numeric columns.' };
  const vecs = {};
  cols.forEach(c => vecs[c] = data.map(r => Number(r[c])));
  const head = ['', ...cols];
  const rows = cols.map(ci => {
    const row = [ci];
    cols.forEach(cj => {
      const pairs = vecs[ci].map((v, i) => [v, vecs[cj][i]]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
      let a = pairs.map(p => p[0]), b = pairs.map(p => p[1]);
      if (method === 'spearman') { a = ranks(a); b = ranks(b); }
      row.push(f(pearsonR(a, b), 3));
    });
    return row;
  });
  return composeResult({ title: `${method === 'spearman' ? 'Spearman' : 'Pearson'} correlation matrix`, tables: [{ head, rows }] });
}

function multipleRegression(data, yCol, predictors) {
  if (!yCol) return miss();
  if (!predictors.length) return { error: 'Select at least one predictor.' };
  const rowsData = data.filter(r => predictors.every(p => !isNaN(Number(r[p]))) && !isNaN(Number(r[yCol])));
  const n = rowsData.length, p = predictors.length;
  if (n < p + 2) return { error: `Need at least ${p + 2} complete rows.` };
  const X = rowsData.map(r => [1, ...predictors.map(pr => Number(r[pr]))]);
  const y = rowsData.map(r => Number(r[yCol]));
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  let inv;
  try { inv = invMat(XtX); } catch (e) { return { error: e.message }; }
  const beta = matVec(inv, matVec(Xt, y));
  const fitted = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const sse = resid.reduce((s, r) => s + r * r, 0);
  const my = mean(y), sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const df = n - p - 1, sigma2 = sse / df;
  const R2 = 1 - sse / sst, adjR2 = 1 - (1 - R2) * (n - 1) / df;
  const F = ((sst - sse) / p) / sigma2, pF = fDistPValue(F, p, df);
  const terms = ['(Intercept)', ...predictors];
  const coefRows = beta.map((b, j) => {
    const se = Math.sqrt(sigma2 * inv[j][j]);
    const t = b / se, pv = 2 * tDistPValue(Math.abs(t), df), tc = tInv(0.025, df);
    return [terms[j], f(b), f(se), f(t), formatPValue(pv), `${f(b - tc * se)} — ${f(b + tc * se)}`];
  });
  return composeResult({
    title: `${p === 1 ? 'Linear' : 'Multiple'} regression — ${yCol} ~ ${predictors.join(' + ')}`,
    tables: [
      { caption: 'Model fit', head: ['Metric', 'Value'], rows: [
        ['Observations', n], ['R²', f(R2, 4)], ['Adjusted R²', f(adjR2, 4)],
        ['F', `${f(F)} (df ${p}, ${df})`], ['p-value', formatPValue(pF)], ['Residual SE', f(Math.sqrt(sigma2))],
      ] },
      { caption: 'Coefficients', head: ['Term', 'Estimate', 'Std. Error', 't', 'p', '95% CI'], rows: coefRows },
    ],
    interp: pF < 0.05 ? `Model is significant (p < 0.05), explaining ${(R2 * 100).toFixed(1)}% of variance.` : 'Model is not significant overall.'
  });
}

function logistic(data, yCol, predictors) {
  if (!yCol) return miss();
  if (!predictors.length) return { error: 'Select at least one predictor.' };
  // Encode response as 0/1
  const levels = [...new Set(data.map(r => r[yCol]).filter(v => v != null))];
  if (levels.length !== 2) return { error: `Response must be binary (found ${levels.length} levels).` };
  const posLevel = levels.slice().sort()[1];
  const rowsData = data.filter(r => r[yCol] != null && predictors.every(p => !isNaN(Number(r[p]))));
  const n = rowsData.length, p = predictors.length;
  if (n < p + 2) return { error: `Need at least ${p + 2} complete rows.` };
  const X = rowsData.map(r => [1, ...predictors.map(pr => Number(r[pr]))]);
  const yv = rowsData.map(r => (String(r[yCol]) === String(posLevel) ? 1 : 0));
  const k = p + 1;
  let beta = new Array(k).fill(0);
  let inv = null;
  for (let iter = 0; iter < 30; iter++) {
    const eta = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
    const mu = eta.map(e => 1 / (1 + Math.exp(-e)));
    const W = mu.map(m => Math.max(m * (1 - m), 1e-9));
    // XtWX and Xt(y-mu)
    const XtWX = Array.from({ length: k }, () => new Array(k).fill(0));
    const grad = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < k; a++) {
        grad[a] += X[i][a] * (yv[i] - mu[i]);
        for (let b = 0; b < k; b++) XtWX[a][b] += X[i][a] * W[i] * X[i][b];
      }
    }
    try { inv = invMat(XtWX); } catch (e) { return { error: 'Model did not converge (' + e.message + ').' }; }
    const delta = matVec(inv, grad);
    beta = beta.map((b, j) => b + delta[j]);
    if (Math.max(...delta.map(Math.abs)) < 1e-8) break;
  }
  // Stats
  const eta = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const mu = eta.map(e => 1 / (1 + Math.exp(-e)));
  const logLik = yv.reduce((s, yi, i) => s + (yi ? Math.log(mu[i] + 1e-12) : Math.log(1 - mu[i] + 1e-12)), 0);
  const pbar = mean(yv);
  const nullLL = yv.reduce((s, yi) => s + (yi ? Math.log(pbar) : Math.log(1 - pbar)), 0);
  const mcFadden = 1 - logLik / nullLL;
  const terms = ['(Intercept)', ...predictors];
  const coefRows = beta.map((b, j) => {
    const se = Math.sqrt(inv[j][j]);
    const z = b / se, pv = 2 * normalCDF(-Math.abs(z));
    return [terms[j], f(b), f(se), f(z), formatPValue(pv), f(Math.exp(b))];
  });
  const acc = mu.reduce((s, m, i) => s + ((m >= 0.5 ? 1 : 0) === yv[i] ? 1 : 0), 0) / n;
  return composeResult({
    title: `Logistic regression — P(${yCol}=${posLevel}) ~ ${predictors.join(' + ')}`,
    tables: [
      { caption: 'Model fit', head: ['Metric', 'Value'], rows: [
        ['Observations', n], ['Log-likelihood', f(logLik)], ['McFadden R²', f(mcFadden, 4)],
        ['Accuracy', f(acc, 3)], ['AIC', f(-2 * logLik + 2 * k)],
      ] },
      { caption: 'Coefficients (log-odds)', head: ['Term', 'Estimate', 'Std. Error', 'z', 'p', 'Odds ratio'], rows: coefRows },
    ],
    interp: `Positive class = "${posLevel}". Odds ratio > 1 raises the odds; < 1 lowers them.`
  });
}

function chiSquared(data, xCol, yCol) {
  const { xl, yl, obs, rowT, colT, N } = crossTab(data, xCol, yCol);
  if (xl.length < 2 || yl.length < 2) return { error: 'Need at least 2 levels in each variable.' };
  let chi2 = 0;
  xl.forEach((_, i) => yl.forEach((__, j) => { const e = rowT[i] * colT[j] / N; if (e > 0) chi2 += (obs[i][j] - e) ** 2 / e; }));
  const df = (xl.length - 1) * (yl.length - 1), p = chiSqPValue(chi2, df);
  const cramer = Math.sqrt(chi2 / (N * Math.min(xl.length - 1, yl.length - 1)));
  return composeResult({
    title: `Chi-squared — ${xCol} × ${yCol}`,
    tables: [
      { caption: 'Contingency table (observed)', head: ['', ...yl], rows: xl.map((x, i) => [x, ...obs[i]]) },
      { head: ['Statistic', 'Value'], rows: [['χ²', f(chi2)], ['df', df], ['p-value', formatPValue(p)], ["Cramér's V", f(cramer)]] },
    ],
    interp: p < 0.05 ? 'Significant association between variables.' : 'No significant association.'
  });
}

function fisherExact(data, xCol, yCol) {
  const { xl, yl, obs } = crossTab(data, xCol, yCol);
  if (xl.length !== 2 || yl.length !== 2) return { error: 'Fisher exact here requires a 2×2 table (both variables must have exactly 2 levels).' };
  const [[a, b], [c, d]] = obs;
  const n = a + b + c + d;
  const logFact = m => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; };
  const rowA = a + b, rowB = c + d, colA = a + c, colB = b + d;
  const base = logFact(rowA) + logFact(rowB) + logFact(colA) + logFact(colB) - logFact(n);
  const prob = (aa) => { const bb = rowA - aa, cc = colA - aa, dd = rowB - cc; if (bb < 0 || cc < 0 || dd < 0) return 0; return Math.exp(base - logFact(aa) - logFact(bb) - logFact(cc) - logFact(dd)); };
  const p0 = prob(a);
  let pTwo = 0;
  const lo = Math.max(0, colA - rowB), hi = Math.min(rowA, colA);
  for (let aa = lo; aa <= hi; aa++) { const pr = prob(aa); if (pr <= p0 * 1.0000001) pTwo += pr; }
  const or = (a * d) / (b * c);
  return composeResult({
    title: `Fisher exact test — ${xCol} × ${yCol}`,
    tables: [
      { caption: 'Contingency table', head: ['', ...yl], rows: [[xl[0], a, b], [xl[1], c, d]] },
      { head: ['Statistic', 'Value'], rows: [['Odds ratio', f(or)], ['p-value (two-sided)', formatPValue(pTwo)]] },
    ],
    interp: pTwo < 0.05 ? 'Significant association (p < 0.05).' : 'No significant association.'
  });
}

function twoProportion(data, xCol, yCol) {
  const g = {};
  const yLevels = [...new Set(data.map(r => r[yCol]).filter(v => v != null))].sort();
  if (yLevels.length !== 2) return { error: `Outcome (Y) must be binary (found ${yLevels.length} levels).` };
  const success = yLevels[1];
  for (const r of data) { if (r[xCol] == null || r[yCol] == null) continue; const k = String(r[xCol]); (g[k] ||= { n: 0, s: 0 }); g[k].n++; if (String(r[yCol]) === String(success)) g[k].s++; }
  const names = Object.keys(g);
  if (names.length !== 2) return { error: `Grouping (X) must have exactly 2 groups (found ${names.length}).` };
  const [A, B] = [g[names[0]], g[names[1]]];
  const p1 = A.s / A.n, p2 = B.s / B.n;
  const pPool = (A.s + B.s) / (A.n + B.n);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / A.n + 1 / B.n));
  const z = (p1 - p2) / se, p = 2 * normalCDF(-Math.abs(z));
  const seDiff = Math.sqrt(p1 * (1 - p1) / A.n + p2 * (1 - p2) / B.n);
  const diff = p1 - p2;
  return composeResult({
    title: `Two-proportion z-test — P(${yCol}=${success}) by ${xCol}`,
    tables: [{ head: ['Statistic', 'Value'], rows: [
      [`Prop (${names[0]})`, `${f(p1, 4)} (${A.s}/${A.n})`], [`Prop (${names[1]})`, `${f(p2, 4)} (${B.s}/${B.n})`],
      ['Difference', f(diff, 4)], ['z', f(z)], ['p-value', formatPValue(p)],
      ['95% CI (diff)', `${f(diff - 1.96 * seDiff, 4)} — ${f(diff + 1.96 * seDiff, 4)}`],
    ] }],
    interp: p < 0.05 ? 'Proportions differ significantly (p < 0.05).' : 'No significant difference in proportions.'
  });
}

function crossTab(data, xCol, yCol) {
  const xSet = new Set(), ySet = new Set(), map = new Map();
  for (const r of data) {
    if (r[xCol] == null || r[yCol] == null) continue;
    const x = String(r[xCol]), y = String(r[yCol]);
    xSet.add(x); ySet.add(y);
    map.set(x + ' ' + y, (map.get(x + ' ' + y) || 0) + 1);
  }
  const xl = [...xSet].sort(), yl = [...ySet].sort();
  const obs = xl.map(x => yl.map(y => map.get(x + ' ' + y) || 0));
  const rowT = obs.map(r => r.reduce((a, b) => a + b, 0));
  const colT = yl.map((_, j) => xl.reduce((s, __, i) => s + obs[i][j], 0));
  const N = rowT.reduce((a, b) => a + b, 0);
  return { xl, yl, obs, rowT, colT, N };
}

/* ═══════════ Math helpers ═══════════ */
const f = (x, d = 3) => formatNumber(x, d);
function mean(a) { return a.reduce((s, b) => s + b, 0) / a.length; }
function variance(a) { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); }
function stddev(a) { return Math.sqrt(variance(a)); }
function quantile(a, q) { const s = [...a].sort((x, y) => x - y); const pos = (s.length - 1) * q, lo = Math.floor(pos); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo); }
function skewness(a) { const m = mean(a), s = stddev(a), n = a.length; if (s === 0) return 0; return (n / ((n - 1) * (n - 2))) * a.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0); }
function kurtosisExcess(a) { const m = mean(a), s = stddev(a), n = a.length; if (s === 0) return 0; const g2 = a.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0) / n; return g2 - 3; }
function pearsonR(x, y) { const n = x.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy); }
function ranks(arr) {
  const idx = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(arr.length);
  let i = 0;
  while (i < idx.length) { let j = i; while (j < idx.length && idx[j].v === idx[i].v) j++; const avg = (i + j + 1) / 2; for (let k = i; k < j; k++) r[idx[k].i] = avg; i = j; }
  return r;
}
function rankInPlace(items) { // items: [{v,...}]; assigns .rank with tie averaging
  items.sort((a, b) => a.v - b.v);
  let i = 0;
  while (i < items.length) { let j = i; while (j < items.length && items[j].v === items[i].v) j++; const avg = (i + j + 1) / 2; for (let k = i; k < j; k++) items[k].rank = avg; i = j; }
}
function tieGroups(sortedVals) { const s = [...sortedVals].sort((a, b) => a - b); const out = []; let i = 0; while (i < s.length) { let j = i; while (j < s.length && s[j] === s[i]) j++; if (j - i > 1) out.push(j - i); i = j; } return out; }

/* Linear algebra */
function transpose(A) { return A[0].map((_, j) => A.map(r => r[j])); }
function matMul(A, B) { const n = A.length, m = B[0].length, p = B.length; const C = Array.from({ length: n }, () => new Array(m).fill(0)); for (let i = 0; i < n; i++) for (let k = 0; k < p; k++) { const a = A[i][k]; for (let j = 0; j < m; j++) C[i][j] += a * B[k][j]; } return C; }
function matVec(A, x) { return A.map(row => row.reduce((s, v, j) => s + v * x[j], 0)); }
function invMat(A) {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) throw new Error('Singular matrix — predictors may be collinear or constant.');
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    for (let k = 0; k < 2 * n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) { if (r === c) continue; const factor = M[r][c]; for (let k = 0; k < 2 * n; k++) M[r][k] -= factor * M[c][k]; }
  }
  return M.map(r => r.slice(n));
}

/* ═══════════ Distributions ═══════════ */
function normalCDF(z) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}
function tDistPValue(t, df) { const x = df / (df + t * t); return 0.5 * incompleteBeta(x, df / 2, 0.5); }
function tInv(p, df) {
  let t = normalInv(p);
  for (let i = 0; i < 12; i++) { const cdf = tDistPValue(Math.abs(t), df); const pdf = tDistPDF(t, df); if (Math.abs(pdf) < 1e-15) break; t -= (cdf - p) / pdf; }
  return Math.abs(t);
}
function normalInv(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
function tDistPDF(t, df) { const coeff = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI); return coeff * Math.pow(1 + t * t / df, -(df + 1) / 2); }
function fDistPValue(fval, d1, d2) { if (fval <= 0) return 1; const x = d2 / (d2 + d1 * fval); return incompleteBeta(x, d2 / 2, d1 / 2); }
function chiSqPValue(x, df) { if (x <= 0) return 1; return 1 - lowerIncompleteGamma(df / 2, x / 2) / gamma(df / 2); }
function incompleteBeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  let fr = 1, c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; fr = d;
  for (let i = 1; i <= 250; i++) {
    const m = i, m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; fr *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = d * c; fr *= delta;
    if (Math.abs(delta - 1) < 1e-11) break;
  }
  return front * fr;
}
function lnGamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function gamma(z) { return Math.exp(lnGamma(z)); }
function lowerIncompleteGamma(s, x) {
  if (x <= 0) return 0;
  let sum = 0, term = 1 / s;
  for (let nn = 1; nn < 400; nn++) { sum += term; term *= x / (s + nn); if (Math.abs(term) < Math.abs(sum) * 1e-13) break; }
  sum += term;
  return Math.exp(-x + s * Math.log(x) - lnGamma(s)) * sum;
}

/* Tukey / studentized range — approximation (Gleason) good enough for reporting */
function tukeyPValue(q, k, df) {
  if (q <= 0) return 1;
  // Numerically integrate the studentized-range CDF
  const cdf = studentizedRangeCDF(q, k, df);
  return Math.max(0, Math.min(1, 1 - cdf));
}
function tukeyQ(alpha, k, df) {
  // invert via bisection on studentizedRangeCDF
  let lo = 0.1, hi = 20;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (studentizedRangeCDF(mid, k, df) < 1 - alpha) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function studentizedRangeCDF(q, k, df) {
  // P(range <= q) for k means; integrate over the studentizing chi. Gauss-Legendre-ish via simple Simpson.
  const phi = z => normalCDF(z), pdf = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  // Range CDF for standard normal spacing at scale s:
  const rangeCDF = (w) => {
    // integral over u of k*pdf(u)*(Phi(u)-Phi(u-w))^(k-1) du
    let sum = 0; const lo = -8, hi = 8, steps = 120, h = (hi - lo) / steps;
    for (let i = 0; i <= steps; i++) {
      const u = lo + i * h;
      const val = k * pdf(u) * Math.pow(Math.max(phi(u) - phi(u - w), 0), k - 1);
      sum += (i === 0 || i === steps ? 1 : (i % 2 ? 4 : 2)) * val;
    }
    return sum * h / 3;
  };
  if (df > 200) return rangeCDF(q);
  // integrate over chi scaling s with df
  const chiPdf = s => { const a = df / 2; return Math.exp((a) * Math.log(df / 2) + (df - 1) * Math.log(s) - df * s * s / 2 - lnGamma(a)) * 2; };
  let sum = 0; const lo = 0.01, hi = 3, steps = 60, h = (hi - lo) / steps;
  for (let i = 0; i <= steps; i++) {
    const s = lo + i * h;
    const val = chiPdf(s) * rangeCDF(q * s);
    sum += (i === 0 || i === steps ? 1 : (i % 2 ? 4 : 2)) * val;
  }
  return sum * h / 3;
}
