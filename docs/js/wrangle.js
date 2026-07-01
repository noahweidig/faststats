/* ── FastStats · wrangle.js ── Data wrangling pipeline (pure JS) ── */
import { getTable, frameToCSV } from './engine.js';
import { runPipeline, describePipeline, autoName } from './pipeline.js';
import { getTableName } from './data.js';
import { createGrid } from './grid.js';
import { $, $$, el, escapeHtml, generateId, showModal, copyToClipboard, showToast, downloadText, commaFormat, truncate, debounce } from './utils.js';

let steps = [];
let selectedId = null;
let wrangleGrid = null;

const STEP_TYPES = [
  { value: 'select', label: 'Select columns' },
  { value: 'mutate', label: 'Mutate column' },
  { value: 'rename', label: 'Rename column' },
  { value: 'filter', label: 'Filter rows' },
  { value: 'sample', label: 'Sample rows' },
  { value: 'distinct', label: 'Keep distinct combinations' },
  { value: 'drop_na', label: 'Drop missing rows' },
  { value: 'replace_na', label: 'Replace missing values' },
  { value: 'group_by', label: 'Group rows' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'pivot_longer', label: 'Pivot longer' },
  { value: 'pivot_wider', label: 'Pivot wider' }
];

export function getSteps() { return steps; }
export function getSelectedId() { return selectedId; }

/* The wrangled frame (base data run through all steps). Used by plot & stats. */
export function getWrangledFrame() {
  return runPipeline(getTable(getTableName()), steps);
}

export async function renderWrangle(store) {
  const container = $('#tab-wrangle');
  if (!container) return;
  const info = store.get('datasetInfo');
  if (!info) { container.innerHTML = '<div class="empty-state"><p>No data loaded.</p></div>'; return; }

  container.innerHTML = `
    <div class="wrangle-layout">
      <div class="wrangle-sidebar">
        <h3 class="section-title">Pipeline</h3>
        <div class="wrangle-add-row">
          <select id="wrangle-add-type" class="form-select">
            ${STEP_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
          <button id="wrangle-add-btn" class="btn btn-primary btn-sm">Add step ➕</button>
        </div>
        <div id="wrangle-steps-list" class="wrangle-steps-list"></div>
        <div id="wrangle-actions" class="wrangle-actions" style="display:none">
          <button id="wrangle-remove-btn" class="btn btn-danger btn-sm">Remove step 🗑️</button>
          <button id="wrangle-download-btn" class="btn btn-secondary btn-sm">Download CSV 📥</button>
          <button id="wrangle-sql-btn" class="btn btn-secondary btn-sm">View recipe 🧾</button>
        </div>
        <div id="wrangle-status"></div>
      </div>
      <div class="wrangle-main">
        <h3 class="section-title">Step settings</h3>
        <div id="wrangle-config">
          <div class="empty-state empty-state-sm">
            <p>Select a step from the pipeline to configure its options.</p>
          </div>
        </div>
        <h3 class="section-title" style="margin-top:1.5rem">Preview</h3>
        <div id="wrangle-grid" class="grid-container" style="height:340px;"></div>
        <div id="wrangle-dims" class="dims-label"></div>
      </div>
    </div>
  `;

  $('#wrangle-add-btn').addEventListener('click', () => addStep(store));
  $('#wrangle-remove-btn')?.addEventListener('click', () => removeStep(store));
  $('#wrangle-download-btn')?.addEventListener('click', () => downloadWrangled());
  $('#wrangle-sql-btn')?.addEventListener('click', () => showRecipeModal());

  renderStepsList(store);
  if (selectedId) renderConfig(store);
  updatePreview(store);
}

function addStep(store) {
  const type = $('#wrangle-add-type')?.value || 'select';
  const step = { id: generateId(), type, args: defaultArgs(type) };
  steps.push(step);
  selectedId = step.id;
  renderStepsList(store);
  renderConfig(store);
  debouncedPreview(store);
}

function removeStep(store) {
  if (!selectedId) return;
  const idx = steps.findIndex(s => s.id === selectedId);
  if (idx === -1) return;
  steps.splice(idx, 1);
  if (steps.length === 0) selectedId = null;
  else selectedId = steps[Math.min(idx, steps.length - 1)].id;
  renderStepsList(store);
  renderConfig(store);
  debouncedPreview(store);
}

function defaultArgs(type) {
  switch (type) {
    case 'select': return { columns: [], mode: 'keep' };
    case 'mutate': return { name: 'new_column', expression: '' };
    case 'rename': return { column: '', newName: '' };
    case 'filter': return { expression: '' };
    case 'sample': return { mode: 'n', size: 10, replace: false };
    case 'distinct': return { columns: [], keepAll: true };
    case 'drop_na': return { columns: [] };
    case 'replace_na': return { column: '', value: '' };
    case 'group_by': return { columns: [] };
    case 'summarize': return { fn: 'mean', column: '', name: '', naRm: true };
    case 'pivot_longer': return { columns: [], namesTo: 'name', valuesTo: 'value', dropNa: false };
    case 'pivot_wider': return { namesFrom: '', valuesFrom: '' };
    default: return {};
  }
}

function stepTitle(type) {
  return STEP_TYPES.find(t => t.value === type)?.label || type;
}

function stepSummary(step) {
  const a = step.args;
  switch (step.type) {
    case 'select': return a.columns?.length ? `${a.mode === 'drop' ? 'Drop' : 'Keep'}: ${a.columns.join(', ')}` : (a.mode === 'drop' ? 'Drop no columns' : 'Keep all columns');
    case 'mutate': return a.name && a.expression ? `${a.name} = ${truncate(a.expression, 40)}` : 'Add a new column';
    case 'rename': return a.column && a.newName ? `${a.column} → ${a.newName}` : 'Rename column';
    case 'filter': return a.expression ? truncate(a.expression, 60) : 'Filter rows';
    case 'sample': return a.mode === 'prop' ? `Sample ${a.size} fraction` : `Sample ${a.size} rows`;
    case 'distinct': return a.columns?.length ? `Distinct on: ${a.columns.join(', ')}` : 'Distinct rows';
    case 'drop_na': return a.columns?.length ? `Drop NA in: ${a.columns.join(', ')}` : 'Drop all missing';
    case 'replace_na': return a.column ? `Replace NA in ${a.column} with ${a.value}` : 'Fill missing';
    case 'group_by': return a.columns?.length ? `Group by: ${a.columns.join(', ')}` : 'Ungroup';
    case 'summarize': return a.fn === 'count' ? `${a.name || 'n'} = count()` : `${a.name || ''} = ${a.fn}(${a.column})`;
    case 'pivot_longer': return a.columns?.length ? `Columns → ${a.namesTo}/${a.valuesTo}` : 'Select columns to pivot';
    case 'pivot_wider': return a.namesFrom && a.valuesFrom ? `Names from ${a.namesFrom}, values from ${a.valuesFrom}` : 'Configure pivot';
    default: return '';
  }
}

function renderStepsList(store) {
  const list = $('#wrangle-steps-list');
  const actions = $('#wrangle-actions');
  if (!list) return;

  if (steps.length === 0) {
    list.innerHTML = '<div class="empty-state empty-state-sm"><p>No steps configured. Use the dropdown above to add a wrangle step.</p></div>';
    if (actions) actions.style.display = 'none';
    return;
  }
  if (actions) actions.style.display = 'flex';

  list.innerHTML = '';
  steps.forEach((step, i) => {
    const item = el('div', {
      className: `wrangle-step-item${step.id === selectedId ? ' selected' : ''}`,
      'data-id': step.id,
      tabindex: '0',
      role: 'button',
      draggable: 'true'
    }, [
      el('div', { className: 'wrangle-step-title' }, `${i + 1}. ${stepTitle(step.type)}`),
      el('div', { className: 'wrangle-step-summary' }, stepSummary(step))
    ]);
    item.addEventListener('click', () => { selectedId = step.id; renderStepsList(store); renderConfig(store); });
    item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', step.id); item.classList.add('dragging'); });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault(); item.classList.remove('drag-over');
      const dragId = e.dataTransfer.getData('text/plain');
      const fromIdx = steps.findIndex(s => s.id === dragId);
      const toIdx = steps.findIndex(s => s.id === step.id);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        const [moved] = steps.splice(fromIdx, 1);
        steps.splice(toIdx, 0, moved);
        renderStepsList(store);
        debouncedPreview(store);
      }
    });
    list.append(item);
  });
}

function renderConfig(store) {
  const config = $('#wrangle-config');
  if (!config) return;

  const step = steps.find(s => s.id === selectedId);
  if (!step) {
    config.innerHTML = '<div class="empty-state empty-state-sm"><p>Select a step from the pipeline to configure its options.</p></div>';
    return;
  }

  const info = store.get('datasetInfo');
  const allCols = info?.allCols || [];

  config.innerHTML = '';
  const form = el('div', { className: 'config-form' });
  const updateArgs = debounce(() => { renderStepsList(store); debouncedPreview(store); }, 250);

  switch (step.type) {
    case 'select': {
      form.append(
        makeMultiSelect('Columns', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); }),
        makeRadio('Mode', [['keep', 'Keep selected'], ['drop', 'Drop selected']], step.args.mode, v => { step.args.mode = v; updateArgs(); })
      );
      break;
    }
    case 'mutate': {
      form.append(
        makeInput('New column name', step.args.name, v => { step.args.name = v; updateArgs(); }),
        makeTextarea('Expression', step.args.expression, v => { step.args.expression = v; updateArgs(); }, 'e.g. sepal_length * 0.5'),
        el('p', { className: 'help-text' }, 'JavaScript expression. Reference columns by name; helpers: sqrt, log, round, upper, lower, ifelse, coalesce, contains… Use $["odd name"] for awkward names.')
      );
      break;
    }
    case 'rename': {
      form.append(
        makeSelect('Column', allCols, step.args.column, v => { step.args.column = v; updateArgs(); }),
        makeInput('New name', step.args.newName, v => { step.args.newName = v; updateArgs(); })
      );
      break;
    }
    case 'filter': {
      form.append(
        makeTextarea('Condition', step.args.expression, v => { step.args.expression = v; updateArgs(); }, "e.g. sepal_length > 5 && species == 'setosa'"),
        el('p', { className: 'help-text' }, 'JavaScript condition — rows where it is true are kept. Use == / && / || and column names directly.')
      );
      break;
    }
    case 'sample': {
      form.append(
        makeRadio('Mode', [['n', 'Number of rows'], ['prop', 'Fraction']], step.args.mode, v => { step.args.mode = v; renderConfig(store); updateArgs(); }),
        makeNumberInput(step.args.mode === 'prop' ? 'Fraction (0–1)' : 'Rows', step.args.size, v => { step.args.size = v; updateArgs(); }, step.args.mode === 'prop' ? 0.01 : 1),
        makeCheckbox('With replacement', step.args.replace, v => { step.args.replace = v; updateArgs(); })
      );
      break;
    }
    case 'distinct': {
      form.append(
        makeMultiSelect('Columns (blank = all)', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); }),
        makeCheckbox('Keep all additional columns', step.args.keepAll, v => { step.args.keepAll = v; updateArgs(); })
      );
      break;
    }
    case 'drop_na': {
      form.append(
        makeMultiSelect('Columns (blank = all)', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); })
      );
      break;
    }
    case 'replace_na': {
      form.append(
        makeSelect('Column', allCols, step.args.column, v => { step.args.column = v; updateArgs(); }, 'Choose column'),
        makeInput('Replacement value', step.args.value, v => { step.args.value = v; updateArgs(); })
      );
      break;
    }
    case 'group_by': {
      form.append(
        makeMultiSelect('Group columns', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); })
      );
      break;
    }
    case 'summarize': {
      const fns = [['mean','Mean'],['median','Median'],['sum','Sum'],['min','Min'],['max','Max'],['stddev','Std Dev'],['count','Count (n)'],['count_distinct','Count distinct']];
      form.append(
        makeSelect('Function', fns.map(f => f[0]), step.args.fn, v => {
          step.args.fn = v;
          if (!step.args.name || step.args.name === autoName(step.args)) step.args.name = autoName({ ...step.args, fn: v });
          renderConfig(store); updateArgs();
        }, null, fns),
        makeSelect('Column', allCols, step.args.column, v => {
          step.args.column = v;
          if (!step.args.name || step.args.name === autoName(step.args)) step.args.name = autoName({ ...step.args, column: v });
          renderConfig(store); updateArgs();
        }, 'Choose column'),
        makeInput('Result name', step.args.name || autoName(step.args), v => { step.args.name = v; updateArgs(); }),
        makeCheckbox('Remove NA values', step.args.naRm, v => { step.args.naRm = v; updateArgs(); })
      );
      break;
    }
    case 'pivot_longer': {
      form.append(
        makeMultiSelect('Columns to pivot', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); }),
        makeInput('Names column', step.args.namesTo, v => { step.args.namesTo = v; updateArgs(); }),
        makeInput('Values column', step.args.valuesTo, v => { step.args.valuesTo = v; updateArgs(); }),
        makeCheckbox('Drop NA values', step.args.dropNa, v => { step.args.dropNa = v; updateArgs(); })
      );
      break;
    }
    case 'pivot_wider': {
      form.append(
        makeSelect('Names from', allCols, step.args.namesFrom, v => { step.args.namesFrom = v; updateArgs(); }, 'Choose column'),
        makeSelect('Values from', allCols, step.args.valuesFrom, v => { step.args.valuesFrom = v; updateArgs(); }, 'Choose column')
      );
      break;
    }
  }
  config.append(form);
}

const debouncedPreview = debounce((store) => updatePreview(store), 300);

function updatePreview(store) {
  const gridDiv = document.getElementById('wrangle-grid');
  const dimsDiv = document.getElementById('wrangle-dims');
  const statusDiv = document.getElementById('wrangle-status');
  if (!gridDiv) return;

  try {
    const frame = getWrangledFrame();
    const rows = frame.rows;

    if (rows.length === 0) {
      if (wrangleGrid) { wrangleGrid.destroy(); wrangleGrid = null; }
      gridDiv.innerHTML = '<div class="empty-state empty-state-sm"><p>No rows after wrangling.</p></div>';
      if (dimsDiv) dimsDiv.textContent = '0 rows × 0 columns';
      if (statusDiv) statusDiv.innerHTML = '';
      return;
    }

    const cols = frame.cols.map(c => ({ field: c.name, headerName: c.name }));
    if (wrangleGrid) { wrangleGrid.destroy(); wrangleGrid = null; }
    wrangleGrid = createGrid(gridDiv, { columns: cols, rows, pageSize: 25 });
    if (dimsDiv) dimsDiv.textContent = `${commaFormat(rows.length)} rows × ${cols.length} columns`;

    if (statusDiv) {
      statusDiv.innerHTML = steps.length > 0
        ? `<div class="status-success">✓ Applied ${steps.length} step(s)</div>`
        : '';
    }
  } catch (err) {
    if (statusDiv) statusDiv.innerHTML = `<div class="status-error">⚠ ${escapeHtml(err.message)}</div>`;
    console.error('[Wrangle]', err);
  }
}

function downloadWrangled() {
  try {
    const frame = getWrangledFrame();
    if (frame.rows.length === 0) { showToast('No data to download', 'error'); return; }
    downloadText(frameToCSV(frame), `wrangled_${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Downloaded!');
  } catch (err) { showToast('Download failed: ' + err.message, 'error'); }
}

function showRecipeModal() {
  const recipe = describePipeline(steps);
  const pre = el('pre', { className: 'code-block' }, recipe);
  const copyBtn = el('button', { className: 'btn btn-secondary btn-sm', onClick: async () => {
    await copyToClipboard(recipe);
    showToast('Copied!');
  }}, 'Copy to clipboard 📋');
  const content = el('div', {}, [
    el('p', {}, 'Human-readable recipe of the wrangling steps:'),
    copyBtn, pre
  ]);
  showModal('Wrangle Recipe', content);
}

/* ── Form helpers ── */
function makeInput(label, value, onChange, placeholder = '') {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const inp = el('input', { type: 'text', className: 'form-input', value: value || '', placeholder });
  inp.addEventListener('input', () => onChange(inp.value));
  wrap.append(inp);
  return wrap;
}

function makeTextarea(label, value, onChange, placeholder = '') {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const ta = el('textarea', { className: 'form-input form-textarea', rows: '3', placeholder });
  ta.value = value || '';
  ta.addEventListener('input', () => onChange(ta.value));
  wrap.append(ta);
  return wrap;
}

function makeNumberInput(label, value, onChange, step = 1) {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const inp = el('input', { type: 'number', className: 'form-input', value: String(value), step: String(step) });
  inp.addEventListener('input', () => onChange(Number(inp.value)));
  wrap.append(inp);
  return wrap;
}

function makeSelect(label, options, value, onChange, placeholder = null, displayOptions = null) {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const sel = el('select', { className: 'form-select' });
  if (placeholder) sel.append(el('option', { value: '' }, placeholder));
  options.forEach((opt) => {
    const display = displayOptions ? displayOptions.find(d => d[0] === opt)?.[1] || opt : opt;
    const o = el('option', { value: opt }, display);
    if (opt === value) o.selected = true;
    sel.append(o);
  });
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.append(sel);
  return wrap;
}

function makeMultiSelect(label, options, selected = [], onChange) {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const container = el('div', { className: 'multi-select-container' });
  const checkboxes = options.map(opt => {
    const lbl = el('label', { className: 'multi-select-option' });
    const cb = el('input', { type: 'checkbox', value: opt });
    if (selected.includes(opt)) cb.checked = true;
    cb.addEventListener('change', () => {
      const vals = checkboxes.filter(c => c.querySelector('input').checked).map(c => c.querySelector('input').value);
      onChange(vals);
    });
    lbl.append(cb, el('span', {}, ' ' + opt));
    return lbl;
  });
  checkboxes.forEach(cb => container.append(cb));
  wrap.append(container);
  return wrap;
}

function makeRadio(label, options, value, onChange) {
  const wrap = el('div', { className: 'form-group' });
  wrap.append(el('label', { className: 'form-label' }, label));
  const name = 'radio_' + generateId();
  options.forEach(([val, lbl]) => {
    const lblEl = el('label', { className: 'radio-option' });
    const inp = el('input', { type: 'radio', name, value: val });
    if (val === value) inp.checked = true;
    inp.addEventListener('change', () => onChange(val));
    lblEl.append(inp, el('span', {}, ' ' + lbl));
    wrap.append(lblEl);
  });
  return wrap;
}

function makeCheckbox(label, checked, onChange) {
  const wrap = el('label', { className: 'checkbox-option' });
  const cb = el('input', { type: 'checkbox' });
  cb.checked = !!checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  wrap.append(cb, el('span', {}, ' ' + label));
  return el('div', { className: 'form-group' }, [wrap]);
}
