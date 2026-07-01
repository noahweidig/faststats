/* ── FastStats · overview.js ── Overview tab ── */
import { el, $, commaFormat } from './utils.js';
import { icon } from './icons.js';

export function renderOverview(store) {
  const container = $('#tab-overview');
  if (!container) return;

  const info = store.get('datasetInfo');
  const rows = info?.rowCount ?? 0;
  const cols = info?.colCount ?? 0;
  const name = info?.name ?? 'No data loaded';
  const desc = info?.description ?? '';

  container.innerHTML = `
    <div class="overview-highlight">
      <span class="highlight-icon">${icon('zap')}</span>
      <div>
        <strong>Welcome to FastStats!</strong>
        <p>Upload a dataset above or explore one of the built-in sample datasets to get started.</p>
      </div>
    </div>

    <div class="card overview-dataset-card">
      <h3>${icon('file')} Active Dataset</h3>
      <div class="dataset-info">
        <p class="dataset-name">${esc(name)}</p>
        ${desc ? `<p class="dataset-description">${esc(desc)}</p>` : ''}
        <p class="dataset-dims">${commaFormat(rows)} rows × ${commaFormat(cols)} columns</p>
        ${renderColumnSummary(info)}
      </div>
    </div>

    <div class="overview-steps">
      ${stepCard('folder', 'Step 1 — Upload or select your data', `
        <p>Use the upload controls at the top of the page to bring in your file.</p>
        <ul>
          <li>Click <strong>Upload CSV/Excel</strong> to choose a .csv, .tsv, or Excel file.</li>
          <li>Keep <strong>CSV has header</strong> checked when your first row holds column names.</li>
          <li>Watch the <strong>Current data</strong> label to confirm what dataset is active.</li>
        </ul>
        <p>No file yet? The classic <code>iris</code> dataset loads automatically, or pick another sample from the dropdown.</p>
      `)}
      ${stepCard('eye', 'Step 2 — Preview and validate', `
        <p>Switch to the <strong>View</strong> tab to inspect your data.</p>
        <ul>
          <li>Scroll through the interactive preview table to spot issues fast.</li>
          <li>Check summary tables for quick stats on numeric and categorical columns.</li>
          <li>Use built-in search and sorting in the data grid.</li>
        </ul>
      `)}
      ${stepCard('wrench', 'Step 3 — Build your wrangling recipe', `
        <p>Visit the <strong>Wrangle</strong> tab to craft a clean data pipeline.</p>
        <ul>
          <li>Choose an <strong>Operation</strong> and click <strong>Add step</strong>.</li>
          <li>Select any step to fine-tune settings and preview the results instantly.</li>
          <li>Drag to reorder steps and remove any step with the trash button.</li>
          <li>Download the cleaned dataset or view the readable recipe.</li>
        </ul>
      `)}
      ${stepCard('chart', 'Step 4 — Visualize insights', `
        <p>Head over to the <strong>Plot</strong> tab and bring your story to life.</p>
        <ul>
          <li>Pick from scatter, line, area, histogram, density, ECDF, box, violin, bar, pie, 2D‑density and correlation matrix.</li>
          <li>Split into small multiples with <strong>Facets</strong> — with shared or free Y scales.</li>
          <li>Fine‑tune log axes, gridlines, markers, palettes, themes, trendlines and titles.</li>
          <li>Export as PNG/SVG, download the plotted data, or push the chart into your report.</li>
        </ul>
      `)}
      ${stepCard('ruler', 'Step 5 — Run statistics', `
        <p>Dive into the <strong>Stats</strong> tab for 20+ analyses.</p>
        <ul>
          <li>Descriptives, normality, t‑tests, ANOVA + Tukey HSD, Kruskal‑Wallis, Mann‑Whitney, Levene, F‑test.</li>
          <li>Correlation (Pearson/Spearman), linear, multiple and logistic regression.</li>
          <li>Chi‑squared, Fisher exact, two‑proportion z — with effect sizes and confidence intervals.</li>
          <li>Every result has one‑click <strong>Copy as text / Markdown</strong> for instant paste.</li>
        </ul>
      `)}
      ${stepCard('file', 'Step 6 — Build a report', `
        <p>Collect results in the <strong>Report</strong> tab and share them.</p>
        <ul>
          <li>Use <strong>Add to report</strong> on any stats result or plot to stack it here.</li>
          <li>Reorder items, then export a self‑contained <strong>HTML</strong> or <strong>Markdown</strong> file.</li>
          <li>Print straight to PDF — no accounts, no uploads, entirely in your browser.</li>
        </ul>
      `)}
      ${stepCard('lightbulb', 'Helpful tips', `
        <ul>
          <li>All data processing happens in your browser — nothing leaves your machine.</li>
          <li>A lightweight pure-JavaScript engine loads instantly — no multi-megabyte downloads.</li>
          <li>Missing values written as <code>NA</code>, <code>null</code> or <code>.</code> are detected automatically.</li>
          <li>Use the download buttons across tabs to export data, charts and full reports.</li>
        </ul>
      `)}
    </div>
  `;
}

function esc(s) {
  const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML;
}

function renderColumnSummary(info) {
  if (!info?.schema) return '';
  const groups = {};
  info.schema.forEach(s => {
    const type = s.isNumeric ? 'Numeric' : s.isDate ? 'Date / time' : 'Categorical / text';
    if (!groups[type]) groups[type] = [];
    groups[type].push(s.name);
  });
  if (Object.keys(groups).length === 0) return '';
  let html = '<div class="column-summary"><strong>Columns</strong><ul>';
  for (const [type, cols] of Object.entries(groups)) {
    const preview = cols.slice(0, 5).join(', ');
    const extra = cols.length > 5 ? ` +${cols.length - 5} more` : '';
    html += `<li><strong>${type}:</strong> ${esc(preview)}${extra}</li>`;
  }
  html += '</ul></div>';
  return html;
}

function stepCard(iconName, title, content) {
  return `
    <div class="card step-card">
      <h3>${icon(iconName)} ${title}</h3>
      ${content}
    </div>
  `;
}
