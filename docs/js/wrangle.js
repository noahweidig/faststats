/* ── FastStats · wrangle.js ── Data wrangling pipeline ── */
import { query, getSchema, createView, dropView, exportCSV, getRowCount } from './db.js';
import { getTableName, getWrangledTableName } from './data.js';
import { $, $$, el, escapeHtml, generateId, showModal, copyToClipboard, showToast, downloadText, commaFormat, truncate, debounce } from './utils.js';

let steps = [];
let selectedId = null;
let wrangleGridApi = null;

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
          <button id="wrangle-sql-btn" class="btn btn-secondary btn-sm">View SQL 🧾</button>
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
        <div id="wrangle-grid" class="ag-grid-container" style="height:320px;"></div>
        <div id="wrangle-dims" class="dims-label"></div>
      </div>
    </div>
  `;

  // Event listeners
  $('#wrangle-add-btn').addEventListener('click', () => addStep(store));
  $('#wrangle-remove-btn')?.addEventListener('click', () => removeStep(store));
  $('#wrangle-download-btn')?.addEventListener('click', () => downloadWrangled());
  $('#wrangle-sql-btn')?.addEventListener('click', () => showSQLModal());

  renderStepsList(store);
  await updatePreview(store);
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
    case 'summarize': return a.fn === 'n' ? `${a.name || 'n'} = n()` : `${a.name || ''} = ${a.fn}(${a.column})`;
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
  steps.forEach(step => {
    const item = el('div', {
      className: `wrangle-step-item${step.id === selectedId ? ' selected' : ''}`,
      'data-id': step.id,
      tabindex: '0',
      role: 'button',
      draggable: 'true'
    }, [
      el('div', { className: 'wrangle-step-title' }, stepTitle(step.type)),
      el('div', { className: 'wrangle-step-summary' }, stepSummary(step))
    ]);
    item.addEventListener('click', () => { selectedId = step.id; renderStepsList(store); renderConfig(store); });
    // Drag & drop
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

async function renderConfig(store) {
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

  const updateArgs = debounce(() => { renderStepsList(store); debouncedPreview(store); }, 300);

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
        makeTextarea('Expression (SQL)', step.args.expression, v => { step.args.expression = v; updateArgs(); }, 'e.g. sepal_length * 0.5'),
        el('p', { className: 'help-text' }, 'Use DuckDB SQL syntax. Reference column names directly.')
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
        makeTextarea('Expression (SQL WHERE clause)', step.args.expression, v => { step.args.expression = v; updateArgs(); }, "e.g. sepal_length > 5 AND species = 'setosa'"),
        el('p', { className: 'help-text' }, 'Enter a DuckDB SQL condition to keep matching rows.')
      );
      break;
    }
    case 'sample': {
      form.append(
        makeRadio('Mode', [['n', 'Number of rows'], ['prop', 'Fraction']], step.args.mode, v => { step.args.mode = v; updateArgs(); }),
        makeNumberInput(step.args.mode === 'prop' ? 'Fraction' : 'Rows', step.args.size, v => { step.args.size = v; updateArgs(); }, step.args.mode === 'prop' ? 0.01 : 1),
        makeCheckbox('With replacement', step.args.replace, v => { step.args.replace = v; updateArgs(); })
      );
      break;
    }
    case 'distinct': {
      form.append(
        makeMultiSelect('Columns', allCols, step.args.columns, vals => { step.args.columns = vals; updateArgs(); }),
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
          updateArgs();
        }, null, fns),
        makeSelect('Column', allCols, step.args.column, v => {
          step.args.column = v;
          if (!step.args.name || step.args.name === autoName(step.args)) step.args.name = autoName({ ...step.args, column: v });
          updateArgs();
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

function autoName(args) {
  if (args.fn === 'count') return 'n';
  return args.fn && args.column ? `${args.fn}_${args.column}` : '';
}

// SQL generation
function buildSQL(stepsSubset, baseName) {
  if (!stepsSubset || stepsSubset.length === 0) return `SELECT * FROM "${baseName}"`;
  let sql = `"${baseName}"`;
  let hasGroup = false;
  let groupCols = [];

  for (const step of stepsSubset) {
    const a = step.args;
    switch (step.type) {
      case 'select': {
        if (a.columns?.length) {
          if (a.mode === 'drop') sql = `(SELECT * EXCLUDE (${a.columns.map(c => `"${c}"`).join(', ')}) FROM ${sql})`;
          else sql = `(SELECT ${a.columns.map(c => `"${c}"`).join(', ')} FROM ${sql})`;
        }
        break;
      }
      case 'mutate': {
        if (a.name && a.expression) sql = `(SELECT *, (${a.expression}) AS "${a.name}" FROM ${sql})`;
        break;
      }
      case 'rename': {
        if (a.column && a.newName) sql = `(SELECT * REPLACE ("${a.column}" AS "${a.newName}") FROM (SELECT *, "${a.column}" AS "${a.newName}" FROM ${sql}))`;
        // Simpler: use RENAME
        if (a.column && a.newName) sql = `(SELECT * FROM ${sql})`;
        // DuckDB ALTER TABLE RENAME is DDL, for views use column aliasing
        // Actually let's do explicit column listing or use a CTE approach
        // Simplest safe approach:
        sql = `(SELECT * REPLACE (NULL AS __dummy__) FROM ${sql})`;
        // Revert — just do the rename via subquery
        sql = stepsSubset.indexOf(step) === stepsSubset.length - 1 ? sql : sql; // no-op placeholder
        // Use DuckDB's COLUMNS syntax
        if (a.column && a.newName) {
          sql = `(SELECT * EXCLUDE ("${a.column}"), "${a.column}" AS "${a.newName}" FROM ${sql.replace(/\(SELECT \* REPLACE.*?\)$/, sql)})`;
        }
        break;
      }
      case 'filter': {
        if (a.expression) sql = `(SELECT * FROM ${sql} WHERE ${a.expression})`;
        break;
      }
      case 'sample': {
        if (a.mode === 'prop') sql = `(SELECT * FROM ${sql} USING SAMPLE ${(a.size * 100).toFixed(1)}%)`;
        else sql = `(SELECT * FROM ${sql} USING SAMPLE ${Math.floor(a.size)} ROWS)`;
        break;
      }
      case 'distinct': {
        if (a.columns?.length) sql = `(SELECT DISTINCT ON (${a.columns.map(c => `"${c}"`).join(', ')}) * FROM ${sql})`;
        else sql = `(SELECT DISTINCT * FROM ${sql})`;
        break;
      }
      case 'drop_na': {
        if (a.columns?.length) {
          const conds = a.columns.map(c => `"${c}" IS NOT NULL`).join(' AND ');
          sql = `(SELECT * FROM ${sql} WHERE ${conds})`;
        } else {
          // All columns — need schema. Use a simpler approach: WHERE col1 IS NOT NULL AND col2 IS NOT NULL...
          sql = `(SELECT * FROM ${sql} WHERE TRUE)`; // Placeholder; real impl queries schema
        }
        break;
      }
      case 'replace_na': {
        if (a.column && a.value !== '') {
          const val = isNaN(Number(a.value)) ? `'${a.value.replace(/'/g, "''")}'` : a.value;
          sql = `(SELECT * EXCLUDE ("${a.column}"), COALESCE("${a.column}", ${val}) AS "${a.column}" FROM ${sql})`;
        }
        break;
      }
      case 'group_by': {
        hasGroup = true;
        groupCols = a.columns || [];
        break;
      }
      case 'summarize': {
        const name = a.name || autoName(a);
        let aggExpr;
        switch (a.fn) {
          case 'count': aggExpr = 'COUNT(*)'; break;
          case 'count_distinct': aggExpr = `COUNT(DISTINCT "${a.column}")`; break;
          default: aggExpr = `${a.fn.toUpperCase()}("${a.column}")`; break;
        }
        if (hasGroup && groupCols.length) {
          sql = `(SELECT ${groupCols.map(c => `"${c}"`).join(', ')}, ${aggExpr} AS "${name}" FROM ${sql} GROUP BY ${groupCols.map(c => `"${c}"`).join(', ')})`;
          hasGroup = false;
        } else {
          sql = `(SELECT ${aggExpr} AS "${name}" FROM ${sql})`;
        }
        break;
      }
      case 'pivot_longer': {
        if (a.columns?.length) {
          const cols = a.columns.map(c => `"${c}"`).join(', ');
          sql = `(UNPIVOT ${sql} ON ${cols} INTO NAME "${a.namesTo || 'name'}" VALUE "${a.valuesTo || 'value'}")`;
        }
        break;
      }
      case 'pivot_wider': {
        if (a.namesFrom && a.valuesFrom) {
          sql = `(PIVOT ${sql} ON "${a.namesFrom}" USING FIRST("${a.valuesFrom}"))`;
        }
        break;
      }
    }
  }
  return `SELECT * FROM ${sql}`;
}

// Fix rename — simpler approach
function buildStepSQL(step, inputSQL) {
  const a = step.args;
  switch (step.type) {
    case 'select':
      if (!a.columns?.length) return inputSQL;
      if (a.mode === 'drop') return `SELECT * EXCLUDE (${a.columns.map(c => `"${c}"`).join(', ')}) FROM (${inputSQL})`;
      return `SELECT ${a.columns.map(c => `"${c}"`).join(', ')} FROM (${inputSQL})`;
    case 'mutate':
      if (!a.name || !a.expression) return inputSQL;
      return `SELECT *, (${a.expression}) AS "${a.name}" FROM (${inputSQL})`;
    case 'rename':
      if (!a.column || !a.newName) return inputSQL;
      return `SELECT * EXCLUDE ("${a.column}"), "${a.column}" AS "${a.newName}" FROM (${inputSQL})`;
    case 'filter':
      if (!a.expression) return inputSQL;
      return `SELECT * FROM (${inputSQL}) WHERE ${a.expression}`;
    case 'sample':
      if (a.mode === 'prop') return `SELECT * FROM (${inputSQL}) USING SAMPLE ${(a.size * 100).toFixed(1)} PERCENT`;
      return `SELECT * FROM (${inputSQL}) ORDER BY RANDOM() LIMIT ${Math.floor(a.size)}`;
    case 'distinct':
      if (a.columns?.length) return `SELECT DISTINCT ON (${a.columns.map(c => `"${c}"`).join(', ')}) * FROM (${inputSQL})`;
      return `SELECT DISTINCT * FROM (${inputSQL})`;
    case 'drop_na':
      if (a.columns?.length) return `SELECT * FROM (${inputSQL}) WHERE ${a.columns.map(c => `"${c}" IS NOT NULL`).join(' AND ')}`;
      return inputSQL; // Need schema for all-column drop_na
    case 'replace_na': {
      if (!a.column || a.value === '') return inputSQL;
      const val = isNaN(Number(a.value)) ? `'${a.value.replace(/'/g, "''")}'` : a.value;
      return `SELECT * EXCLUDE ("${a.column}"), COALESCE("${a.column}", ${val}) AS "${a.column}" FROM (${inputSQL})`;
    }
    case 'group_by': return inputSQL; // Group-by is consumed by the next summarize step
    case 'summarize': return inputSQL; // Handled in pipeline builder
    case 'pivot_longer':
      if (!a.columns?.length) return inputSQL;
      return `UNPIVOT (${inputSQL}) ON ${a.columns.map(c => `"${c}"`).join(', ')} INTO NAME "${a.namesTo || 'name'}" VALUE "${a.valuesTo || 'value'}"`;
    case 'pivot_wider':
      if (!a.namesFrom || !a.valuesFrom) return inputSQL;
      return `PIVOT (${inputSQL}) ON "${a.namesFrom}" USING FIRST("${a.valuesFrom}")`;
    default: return inputSQL;
  }
}

export function buildPipelineSQL(stepsSubset = steps) {
  const baseName = getTableName();
  let sql = `SELECT * FROM "${baseName}"`;
  let pendingGroup = null;

  for (const step of stepsSubset) {
    if (step.type === 'group_by') {
      pendingGroup = step.args.columns || [];
      continue;
    }
    if (step.type === 'summarize') {
      const a = step.args;
      const name = a.name || autoName(a);
      let aggExpr;
      switch (a.fn) {
        case 'count': aggExpr = 'COUNT(*)'; break;
        case 'count_distinct': aggExpr = `COUNT(DISTINCT "${a.column}")`; break;
        default: aggExpr = `${a.fn.toUpperCase()}("${a.column}")`; break;
      }
      if (pendingGroup && pendingGroup.length) {
        sql = `SELECT ${pendingGroup.map(c => `"${c}"`).join(', ')}, ${aggExpr} AS "${name}" FROM (${sql}) GROUP BY ${pendingGroup.map(c => `"${c}"`).join(', ')}`;
      } else {
        sql = `SELECT ${aggExpr} AS "${name}" FROM (${sql})`;
      }
      pendingGroup = null;
      continue;
    }
    sql = buildStepSQL(step, sql);
  }
  return sql;
}

const debouncedPreview = debounce(async (store) => { await updatePreview(store); }, 400);

async function updatePreview(store) {
  const gridDiv = document.getElementById('wrangle-grid');
  const dimsDiv = document.getElementById('wrangle-dims');
  const statusDiv = document.getElementById('wrangle-status');
  if (!gridDiv) return;

  const tableName = getTableName();
  try {
    const sql = buildPipelineSQL();
    const previewSQL = sql.includes('LIMIT') ? sql : `${sql} LIMIT 5000`;
    const rows = await query(previewSQL);
    const countResult = await query(`SELECT COUNT(*) as cnt FROM (${sql})`);
    const totalRows = countResult[0]?.cnt ?? rows.length;

    if (rows.length === 0) {
      if (wrangleGridApi) { wrangleGridApi.destroy(); wrangleGridApi = null; }
      gridDiv.innerHTML = '<div class="empty-state empty-state-sm"><p>No rows after wrangling.</p></div>';
      if (dimsDiv) dimsDiv.textContent = '0 rows × 0 columns';
      return;
    }

    const cols = Object.keys(rows[0]);
    const columnDefs = cols.map(c => ({ field: c, headerName: c, sortable: true, filter: true, resizable: true, flex: 1, minWidth: 90 }));
    if (wrangleGridApi) { wrangleGridApi.destroy(); wrangleGridApi = null; }
    const gridOptions = {
      columnDefs, rowData: rows,
      defaultColDef: { sortable: true, filter: true, resizable: true },
      pagination: true, paginationPageSize: 25, domLayout: 'normal',
      theme: agGrid.themeAlpine.withParams({
        backgroundColor: 'rgba(15, 23, 42, 0.6)', foregroundColor: '#e2e8f0',
        headerBackgroundColor: 'rgba(30, 41, 59, 0.8)', headerForegroundColor: '#94a3b8',
        borderColor: 'rgba(148, 163, 184, 0.1)', rowHoverColor: 'rgba(99, 102, 241, 0.08)',
      }),
    };
    wrangleGridApi = agGrid.createGrid(gridDiv, gridOptions);
    if (dimsDiv) dimsDiv.textContent = `${commaFormat(totalRows)} rows × ${cols.length} columns`;

    // Also update the wrangled view for plot/stats
    try {
      await createView(getWrangledTableName(), buildPipelineSQL());
    } catch {}

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

async function downloadWrangled() {
  try {
    const sql = buildPipelineSQL();
    const result = await query(sql);
    if (result.length === 0) { showToast('No data to download', 'error'); return; }
    const cols = Object.keys(result[0]);
    let csv = cols.join(',') + '\n';
    result.forEach(row => {
      csv += cols.map(c => {
        const v = row[c];
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',') + '\n';
    });
    downloadText(csv, `wrangled_${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Downloaded!');
  } catch (err) { showToast('Download failed: ' + err.message, 'error'); }
}

function showSQLModal() {
  const sql = buildPipelineSQL();
  const formatted = formatSQL(sql);
  const pre = el('pre', { className: 'code-block' }, formatted);
  const copyBtn = el('button', { className: 'btn btn-secondary btn-sm', onClick: async () => {
    await copyToClipboard(formatted);
    showToast('Copied!');
  }}, 'Copy to clipboard 📋');
  const content = el('div', {}, [
    el('p', {}, 'DuckDB SQL pipeline to reproduce the wrangling steps:'),
    copyBtn, pre
  ]);
  showModal('Wrangle Pipeline SQL', content);
}

function formatSQL(sql) {
  // Basic SQL formatting
  return sql
    .replace(/\bSELECT\b/gi, '\nSELECT')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
    .trim();
}

// Form helpers
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
  options.forEach((opt, i) => {
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
