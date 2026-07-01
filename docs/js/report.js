/* ── FastStats · report.js ── Result formatting, copy/paste & report builder ──
 *
 * A single place that turns a structured result ({ title, tables[], interp })
 * into HTML, plain text and Markdown, provides a reusable copy/report toolbar,
 * and collects items into an exportable report (standalone HTML / Markdown / print).
 */
import { $, el, escapeHtml, copyToClipboard, showToast, downloadText, debounce } from './utils.js';
import { loadMarked } from './lazy.js';
import { icon } from './icons.js';

/* ── Report store ── */
const items = [];               // { id, kind, title, html, text, md, ts }
const listeners = new Set();
let seq = 0;

export function onReportChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(fn => { try { fn(items); } catch {} }); updateBadge(); }

export function getReportItems() { return items; }
export function reportCount() { return items.length; }

export function addReportItem({ kind = 'stat', title, html, text = '', md = '' }) {
  items.push({ id: `r${++seq}`, kind, title: title || 'Untitled', html, text, md, ts: Date.now() });
  notify();
  showToast('Added to report');
}
export function removeReportItem(id) {
  const i = items.findIndex(x => x.id === id);
  if (i !== -1) { items.splice(i, 1); notify(); }
}
export function moveReportItem(id, dir) {
  const i = items.findIndex(x => x.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  notify();
}
export function clearReport() { items.length = 0; notify(); }

export function addMarkdownItem() {
  const md = '## New section\n\nType Markdown here — **bold**, _italic_, lists, links, tables and more. It renders live, just like it will look in the exported report.';
  items.push({ id: `r${++seq}`, kind: 'markdown', title: 'Markdown', html: '', text: md, md, ts: Date.now() });
  notify();
}

function updateBadge() {
  const b = $('#report-count-badge');
  if (b) { b.textContent = items.length; b.style.display = items.length ? 'inline-flex' : 'none'; }
}

/* ── Result composition: structured → { html, text, md } ── */
/* result = { title, tables:[{caption?, head:[], rows:[[]], align?:[]}], interp?, notes?:[] } */
export function composeResult(res) {
  const { title, tables = [], interp = '', notes = [] } = res;
  let html = `<div class="stat-result-card"><div class="stat-card-head"><h4>${escapeHtml(title)}</h4></div>`;
  let text = `${title}\n${'='.repeat(title.length)}\n`;
  let md = `### ${title}\n\n`;

  for (const t of tables) {
    if (t.caption) { html += `<h5 class="stat-subhead">${escapeHtml(t.caption)}</h5>`; text += `\n${t.caption}\n`; md += `**${t.caption}**\n\n`; }
    html += renderHtmlTable(t.head, t.rows);
    text += textTable(t.head, t.rows) + '\n';
    md += mdTable(t.head, t.rows) + '\n';
  }
  for (const n of notes) { html += `<p class="stat-note">${escapeHtml(n)}</p>`; text += `\n${n}\n`; md += `\n${n}\n`; }
  if (interp) { html += `<p class="stat-interpretation">${escapeHtml(interp)}</p>`; text += `\n${interp}\n`; md += `\n> ${interp}\n`; }
  html += '</div>';
  return { title, html, text, md };
}

function renderHtmlTable(head, rows) {
  let h = '<table class="data-table"><thead><tr>';
  head.forEach((c, i) => { h += `<th${i ? ' class="num"' : ''}>${escapeHtml(String(c))}</th>`; });
  h += '</tr></thead><tbody>';
  for (const row of rows) {
    h += '<tr>';
    row.forEach((c, i) => { h += `<td${i ? ' class="num"' : ''}>${escapeHtml(String(c))}</td>`; });
    h += '</tr>';
  }
  return h + '</tbody></table>';
}

function colWidths(head, rows) {
  return head.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] ?? '').length)));
}
function textTable(head, rows) {
  const w = colWidths(head, rows);
  const pad = (s, i) => (i === 0 ? String(s).padEnd(w[i]) : String(s).padStart(w[i]));
  const line = arr => arr.map((c, i) => pad(c, i)).join('  ');
  const sep = w.map(x => '-'.repeat(x)).join('  ');
  return [line(head), sep, ...rows.map(line)].join('\n');
}
function mdTable(head, rows) {
  const esc = s => String(s).replace(/\|/g, '\\|');
  const h = `| ${head.map(esc).join(' | ')} |`;
  const sep = `| ${head.map((_, i) => (i ? '---:' : '---')).join(' | ')} |`;
  const body = rows.map(r => `| ${r.map(esc).join(' | ')} |`).join('\n');
  return `${h}\n${sep}\n${body}`;
}

/* ── Reusable copy / add-to-report toolbar ── */
export function resultToolbar(result, { kind = 'stat' } = {}) {
  const bar = el('div', { className: 'result-toolbar' });
  const mkBtn = (label, fn) => el('button', { className: 'btn btn-ghost btn-xs', onClick: fn }, label);
  bar.append(
    mkBtn('Copy text', async () => { await copyToClipboard(result.text); showToast('Copied as text'); }),
    mkBtn('Copy Markdown', async () => { await copyToClipboard(result.md); showToast('Copied as Markdown'); }),
    mkBtn('Add to report', () => addReportItem({ kind, title: result.title, html: result.html, text: result.text, md: result.md }))
  );
  return bar;
}

/* Render a composed result plus toolbar into a container element (returns node). */
export function renderResultInto(container, result, opts = {}) {
  const wrap = el('div', { className: 'result-block' });
  wrap.innerHTML = result.html;
  wrap.append(resultToolbar(result, opts));
  container.append(wrap);
  return wrap;
}

/* ── Report tab ── */
export function renderReport(store) {
  const container = $('#tab-report');
  if (!container) return;

  container.innerHTML = `
    <div class="report-head">
      <div>
        <h3 class="section-title" style="margin:0">Report builder</h3>
        <p class="help-text" style="margin:.25rem 0 0">Collect stats results and plots, then export a shareable document.</p>
      </div>
      <div class="report-actions">
        <button id="report-add-md" class="btn btn-secondary btn-sm">Add Markdown block</button>
        <button id="report-copy-md" class="btn btn-secondary btn-sm">Copy all (Markdown)</button>
        <button id="report-dl-md" class="btn btn-secondary btn-sm">Download .md</button>
        <button id="report-dl-html" class="btn btn-primary btn-sm">Download HTML</button>
        <button id="report-print" class="btn btn-secondary btn-sm">Print / PDF</button>
        <button id="report-clear" class="btn btn-danger btn-sm">Clear</button>
      </div>
    </div>
    <div class="form-group report-meta">
      <input type="text" id="report-title-input" class="form-input" placeholder="Report title (optional)" value="">
    </div>
    <div id="report-list" class="report-list"></div>
  `;

  const listEl = $('#report-list');
  const draw = () => drawList(listEl);
  draw();
  const off = onReportChange(draw);
  // Re-bind cleanup on next render is unnecessary (idempotent); listeners are a Set.

  $('#report-add-md')?.addEventListener('click', () => addMarkdownItem());
  $('#report-clear')?.addEventListener('click', () => {
    if (items.length && confirm('Remove all report items?')) clearReport();
  });
  $('#report-copy-md')?.addEventListener('click', async () => {
    if (!items.length) return showToast('Report is empty', 'error');
    await copyToClipboard(buildMarkdown()); showToast('Report copied as Markdown');
  });
  $('#report-dl-md')?.addEventListener('click', () => {
    if (!items.length) return showToast('Report is empty', 'error');
    downloadText(buildMarkdown(), `faststats_report_${stamp()}.md`, 'text/markdown');
  });
  $('#report-dl-html')?.addEventListener('click', () => {
    if (!items.length) return showToast('Report is empty', 'error');
    downloadText(buildHtml(), `faststats_report_${stamp()}.html`, 'text/html');
  });
  $('#report-print')?.addEventListener('click', () => {
    if (!items.length) return showToast('Report is empty', 'error');
    printReport();
  });
}

function reportTitle() { return ($('#report-title-input')?.value || '').trim() || 'Report'; }
function stamp() { return new Date().toISOString().slice(0, 10); }

function drawList(listEl) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = `<div class="empty-state"><p>No items yet. Use <strong>Add to report</strong> on any stats result or plot to collect it here.</p></div>`;
    return;
  }
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const card = el('div', { className: 'report-item' });
    const kindIcon = icon(it.kind === 'plot' ? 'chart' : it.kind === 'markdown' ? 'markdown' : 'ruler');
    const head = el('div', { className: 'report-item-head' }, [
      el('span', { className: 'report-item-kind', innerHTML: kindIcon }),
      el('span', { className: 'report-item-title' }, it.kind === 'markdown' ? 'Markdown block' : it.title),
      el('div', { className: 'report-item-tools' }, [
        el('button', { className: 'btn btn-ghost btn-xs', title: 'Move up', 'aria-label': 'Move up', innerHTML: icon('arrowUp'), onClick: () => moveReportItem(it.id, -1) }),
        el('button', { className: 'btn btn-ghost btn-xs', title: 'Move down', 'aria-label': 'Move down', innerHTML: icon('arrowDown'), onClick: () => moveReportItem(it.id, 1) }),
        el('button', { className: 'btn btn-ghost btn-xs', title: 'Remove', 'aria-label': 'Remove', innerHTML: icon('x'), onClick: () => removeReportItem(it.id) }),
      ])
    ]);
    const body = el('div', { className: 'report-item-body' });
    if (it.kind === 'markdown') {
      renderMarkdownEditor(it, body);
    } else {
      body.innerHTML = it.html;
    }
    card.append(head, body);
    listEl.append(card);
  });
}

/* Markdown block: a textarea + a live rendered preview that updates as the user types,
   so the report item always shows what it will look like in the export (not raw text). */
function renderMarkdownEditor(it, body) {
  const wrap = el('div', { className: 'md-editor' });
  const textarea = el('textarea', { className: 'md-editor-input' });
  textarea.value = it.md;
  const preview = el('div', { className: 'md-editor-preview' });
  wrap.append(textarea, preview);
  body.append(wrap);

  const render = async () => {
    try {
      const marked = await loadMarked();
      const html = marked.parse(it.md || '');
      it.html = `<div class="md-block">${html}</div>`;
      preview.innerHTML = html;
    } catch (e) {
      preview.innerHTML = `<p class="stat-note">Markdown preview unavailable: ${escapeHtml(e.message)}</p>`;
    }
  };
  const onInput = debounce(() => { it.md = textarea.value; it.text = it.md; render(); }, 150);
  textarea.addEventListener('input', onInput);
  render();
}

function buildMarkdown() {
  const head = `# ${reportTitle()}\n\n_${new Date().toLocaleString()}_\n\n`;
  return head + items.map(it => it.md || `### ${it.title}\n`).join('\n\n---\n\n') + '\n';
}

function buildHtml() {
  const body = items.map(it => `<section class="ri">${it.html}</section>`).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(reportTitle())}</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,Inter,sans-serif;max-width:920px;margin:2rem auto;padding:0 1.25rem;color:#0f172a;background:#fff;line-height:1.5;font-size:14px}
h1{font-size:1.5rem;margin:0 0 .25rem}
h4{margin:.2rem 0 .6rem;font-size:1.05rem}
h5{margin:.8rem 0 .3rem;color:#334155;font-size:.92rem}
.meta{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}
.ri{border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;margin:0 0 1.25rem;box-shadow:0 1px 3px rgba(0,0,0,.05);overflow-x:auto}
table{border-collapse:collapse;width:100%;margin:.5rem 0;font-size:.85rem}
th,td{border:1px solid #e2e8f0;padding:.35rem .55rem;text-align:left;overflow-wrap:break-word}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums}
thead th{background:#f1f5f9}
img{max-width:100%;height:auto;border-radius:8px}
.stat-interpretation{background:#f0f9ff;border-left:3px solid #0ea5e9;padding:.5rem .75rem;border-radius:6px;margin:.6rem 0 0}
.stat-note{color:#475569;font-size:.88rem}
.md-block h1,.md-block h2,.md-block h3,.md-block h4,.md-block h5,.md-block h6{font-weight:700;margin:.9em 0 .4em;line-height:1.3}
.md-block h1{font-size:1.35rem}.md-block h2{font-size:1.2rem}.md-block h3{font-size:1.08rem}.md-block h4{font-size:1rem}
.md-block :first-child{margin-top:0}
.md-block p{margin:.6em 0}
.md-block a{color:#4f46e5}
.md-block ul,.md-block ol{margin:.5em 0;padding-left:1.5em}
.md-block blockquote{margin:.6em 0;padding:.3em 1em;border-left:3px solid #0ea5e9;background:#f0f9ff;color:#334155}
.md-block code{font-family:Menlo,Consolas,monospace;font-size:.85em;background:#f1f5f9;padding:.15em .4em;border-radius:4px}
.md-block pre{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.75em 1em;overflow-x:auto}
.md-block pre code{background:none;padding:0}
.md-block hr{border:none;border-top:1px solid #e2e8f0;margin:1em 0}
@page{margin:14mm}
@media print{
body{margin:0;padding:0;max-width:100%;font-size:10.5pt}
h1{font-size:15pt}h4{font-size:11.5pt}h5{font-size:10pt}
.ri{break-inside:avoid;box-shadow:none;overflow:visible}
table{font-size:8.5pt;table-layout:fixed;word-break:break-word}
th,td{padding:.25rem .4rem}
pre,code{white-space:pre-wrap;word-break:break-word}
.md-block pre{overflow:visible}
img{max-width:100%!important;height:auto!important}
}
</style></head><body>
<h1>${escapeHtml(reportTitle())}</h1>
<div class="meta">${escapeHtml(new Date().toLocaleString())}</div>
${body}
</body></html>`;
}

function printReport() {
  const w = window.open('', '_blank');
  if (!w) { showToast('Popup blocked — allow popups to print', 'error'); return; }
  w.document.write(buildHtml());
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}
