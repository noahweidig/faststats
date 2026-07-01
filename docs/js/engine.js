/* ── FastStats · engine.js ── Pure-JS in-browser data engine ──
 *
 * Replaces DuckDB-WASM. No 35 MB WASM download, no web worker, no CDN —
 * everything runs synchronously in the page. Datasets are held as simple
 * { cols, rows } "data frames":
 *   cols: [{ name, type, isNumeric, isDate, isCategorical }]
 *   rows: [{ colName: value, ... }]   (numbers as Number, dates as ISO string, missing as null)
 */

const tables = new Map();

/* ── CSV parsing (RFC-4180-ish: quotes, embedded commas/newlines) ── */
export function parseCSV(text, { header = true, delimiter = null } = {}) {
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Auto-detect delimiter from the first line if not given
  if (!delimiter) {
    const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
    const counts = { ',': 0, '\t': 0, ';': 0, '|': 0 };
    let inQ = false;
    for (const ch of firstLine) {
      if (ch === '"') inQ = !inQ;
      else if (!inQ && ch in counts) counts[ch]++;
    }
    delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    if (counts[delimiter] === 0) delimiter = ',';
  }

  const records = [];
  let field = '';
  let record = [];
  let inQ = false;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delimiter) {
      record.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') records.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== '' || record.length) { record.push(field); if (record.length > 1 || record[0] !== '') records.push(record); }

  if (records.length === 0) return { cols: [], rows: [] };

  let headerNames;
  let dataRows;
  if (header) {
    headerNames = records[0].map((h, i) => (h && h.trim()) || `column_${i + 1}`);
    dataRows = records.slice(1);
  } else {
    headerNames = records[0].map((_, i) => `V${i + 1}`);
    dataRows = records;
  }
  // De-duplicate header names
  const seen = new Map();
  headerNames = headerNames.map(h => {
    if (!seen.has(h)) { seen.set(h, 1); return h; }
    const c = seen.get(h) + 1; seen.set(h, c); return `${h}_${c}`;
  });

  return buildFrame(headerNames, dataRows);
}

const NUM_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;
// Tokens treated as missing everywhere (must match `coerce` below).
const MISSING = new Set(['', 'NA', 'N/A', 'na', 'null', 'NULL', 'NaN', '.', '-']);

function buildFrame(names, rawRows) {
  const nCols = names.length;
  // Infer column types from the raw string cells
  const types = names.map((_, c) => {
    let numeric = true, date = true, seen = 0;
    for (let r = 0; r < rawRows.length && seen < 500; r++) {
      const cell = rawRows[r][c];
      if (cell == null) continue;
      const s = cell.trim();
      if (MISSING.has(s)) continue;
      seen++;
      if (numeric && !NUM_RE.test(s)) numeric = false;
      if (date && !DATE_RE.test(s)) date = false;
      if (!numeric && !date) break;
    }
    if (seen === 0) return 'string';
    if (numeric) return 'number';
    if (date) return 'date';
    return 'string';
  });

  const rows = rawRows.map(rr => {
    const obj = {};
    for (let c = 0; c < nCols; c++) {
      obj[names[c]] = coerce(rr[c], types[c]);
    }
    return obj;
  });

  const cols = names.map((name, c) => makeColMeta(name, types[c]));
  return { cols, rows };
}

function coerce(cell, type) {
  if (cell == null) return null;
  const s = typeof cell === 'string' ? cell.trim() : cell;
  if (typeof s === 'string' && MISSING.has(s)) return null;
  if (type === 'number') { const n = Number(s); return isNaN(n) ? null : n; }
  return String(s);
}

function makeColMeta(name, type) {
  return {
    name, type,
    isNumeric: type === 'number',
    isDate: type === 'date',
    isCategorical: type === 'string' || type === 'boolean',
  };
}

/* Re-infer column metadata for an arbitrary rows array (used after wrangling). */
export function inferSchema(rows) {
  if (!rows.length) return [];
  const names = Object.keys(rows[0]);
  return names.map(name => {
    let numeric = true, date = true, seen = 0;
    for (let r = 0; r < rows.length && seen < 500; r++) {
      const v = rows[r][name];
      if (v == null) continue;
      seen++;
      if (numeric && typeof v !== 'number') numeric = false;
      if (date && !(typeof v === 'string' && DATE_RE.test(v))) date = false;
      if (!numeric && !date) break;
    }
    const type = seen === 0 ? 'string' : numeric ? 'number' : date ? 'date' : 'string';
    return makeColMeta(name, type);
  });
}

/* ── Table registry ── */
export function setTable(name, frame) {
  tables.set(name, frame);
}
export function getTable(name) {
  return tables.get(name) || { cols: [], rows: [] };
}
export function getSchema(name) {
  return getTable(name).cols;
}
export function getRows(name) {
  return getTable(name).rows;
}
export function getRowCount(name) {
  return getTable(name).rows.length;
}
export function getColumns(name) {
  return getTable(name).cols.map(c => c.name);
}
export function tableExists(name) {
  return tables.has(name);
}

export function getColumnValues(name, colName, limit = 1000) {
  const rows = getRows(name);
  const set = new Set();
  for (const r of rows) {
    const v = r[colName];
    if (v != null) set.add(v);
    if (set.size >= limit) break;
  }
  return [...set].sort(defaultCompare);
}

export function defaultCompare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/* ── Loaders ── */
export function loadCSVString(text, tableName, opts = {}) {
  const frame = parseCSV(text, opts);
  setTable(tableName, frame);
  return frame;
}
export async function loadCSVFromURL(url, tableName, opts = {}) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url} (${resp.status})`);
  const text = await resp.text();
  return loadCSVString(text, tableName, opts);
}
export async function loadCSVFile(file, tableName, opts = {}) {
  const text = await file.text();
  return loadCSVString(text, tableName, opts);
}

/* ── CSV export ── */
export function frameToCSV(frame) {
  const cols = frame.cols.map(c => c.name);
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  let csv = cols.map(esc).join(',') + '\n';
  for (const row of frame.rows) {
    csv += cols.map(c => esc(row[c])).join(',') + '\n';
  }
  return csv;
}
export function exportCSV(name) {
  return frameToCSV(getTable(name));
}
