/* ── FastStats · pipeline.js ── Wrangling transforms (pure JS) ──
 *
 * Each step maps one { cols, rows } frame to another. This replaces the old
 * DuckDB SQL-string generator with direct, deterministic JS transforms.
 * mutate/filter accept a JavaScript expression evaluated per row, where each
 * column is available as a bare variable (e.g. `sepal_length * 2`) plus a set
 * of helper functions (sqrt, log, upper, ifelse, …).
 */
import { inferSchema, defaultCompare } from './engine.js';

/* Helper functions exposed inside mutate/filter expressions. */
const HELPERS = {
  abs: Math.abs, sqrt: Math.sqrt, exp: Math.exp, pow: Math.pow,
  log: (x, b) => b ? Math.log(x) / Math.log(b) : Math.log(x),
  log2: Math.log2, log10: Math.log10,
  round: (x, d = 0) => { const f = 10 ** d; return Math.round(x * f) / f; },
  floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
  min: Math.min, max: Math.max, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  upper: s => s == null ? null : String(s).toUpperCase(),
  lower: s => s == null ? null : String(s).toLowerCase(),
  trim: s => s == null ? null : String(s).trim(),
  len: s => s == null ? null : String(s).length,
  substr: (s, a, b) => s == null ? null : String(s).slice(a, b),
  concat: (...a) => a.map(v => v == null ? '' : v).join(''),
  contains: (s, sub) => s == null ? false : String(s).includes(sub),
  replace: (s, a, b) => s == null ? null : String(s).split(a).join(b),
  ifelse: (cond, a, b) => cond ? a : b,
  isNA: v => v == null || (typeof v === 'number' && isNaN(v)),
  coalesce: (...a) => { for (const v of a) if (v != null) return v; return null; },
  toNumber: v => { const n = Number(v); return isNaN(n) ? null : n; },
  toString: v => v == null ? null : String(v),
  PI: Math.PI, E: Math.E,
};

const compileCache = new Map();

function compileExpr(expr) {
  if (compileCache.has(expr)) return compileCache.get(expr);
  let fn;
  try {
    // `$` gives raw row access for awkward column names: $['weird name']
    // eslint-disable-next-line no-new-func
    fn = new Function('$', '$H', `with($H){ with($){ return (${expr}); } }`);
  } catch (e) {
    throw new Error(`Invalid expression: ${e.message}`);
  }
  const wrapped = (row) => fn(row, HELPERS);
  compileCache.set(expr, wrapped);
  return wrapped;
}

/* ── Aggregation functions used by summarize ── */
const AGG = {
  mean: vs => vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null,
  sum: vs => vs.reduce((a, b) => a + b, 0),
  min: vs => vs.length ? Math.min(...vs) : null,
  max: vs => vs.length ? Math.max(...vs) : null,
  median: vs => {
    if (!vs.length) return null;
    const s = [...vs].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  stddev: vs => {
    if (vs.length < 2) return null;
    const m = vs.reduce((a, b) => a + b, 0) / vs.length;
    return Math.sqrt(vs.reduce((a, v) => a + (v - m) ** 2, 0) / (vs.length - 1));
  },
};

function frameOf(rows) {
  return { cols: inferSchema(rows), rows };
}

/* Run a single step against an input frame. `state` carries a pending group_by. */
function applyStep(frame, step, state) {
  const a = step.args || {};
  const rows = frame.rows;
  switch (step.type) {
    case 'select': {
      if (!a.columns?.length) return frame;
      const names = frame.cols.map(c => c.name);
      const keep = a.mode === 'drop'
        ? names.filter(n => !a.columns.includes(n))
        : a.columns.filter(n => names.includes(n));
      return frameOf(rows.map(r => Object.fromEntries(keep.map(k => [k, r[k]]))));
    }
    case 'mutate': {
      if (!a.name || !a.expression) return frame;
      const fn = compileExpr(a.expression);
      return frameOf(rows.map(r => {
        let v;
        try { v = fn(r); } catch { v = null; }
        if (v === undefined) v = null;
        return { ...r, [a.name]: v };
      }));
    }
    case 'rename': {
      if (!a.column || !a.newName) return frame;
      return frameOf(rows.map(r => {
        const o = {};
        for (const k of Object.keys(r)) o[k === a.column ? a.newName : k] = r[k];
        return o;
      }));
    }
    case 'filter': {
      if (!a.expression) return frame;
      const fn = compileExpr(a.expression);
      return frameOf(rows.filter(r => {
        try { return !!fn(r); } catch { return false; }
      }));
    }
    case 'sample': {
      const shuffled = [...rows];
      if (a.replace) {
        const n = a.mode === 'prop' ? Math.round(rows.length * a.size) : Math.floor(a.size);
        const out = [];
        for (let i = 0; i < n && rows.length; i++) out.push(rows[Math.floor(Math.random() * rows.length)]);
        return frameOf(out);
      }
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const n = a.mode === 'prop' ? Math.round(rows.length * a.size) : Math.floor(a.size);
      return frameOf(shuffled.slice(0, Math.max(0, n)));
    }
    case 'distinct': {
      const keyCols = a.columns?.length ? a.columns : frame.cols.map(c => c.name);
      const seen = new Set();
      const out = [];
      for (const r of rows) {
        const key = keyCols.map(c => r[c]).join('');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a.keepAll ? r : Object.fromEntries(keyCols.map(k => [k, r[k]])));
      }
      return frameOf(out);
    }
    case 'drop_na': {
      const cols = a.columns?.length ? a.columns : frame.cols.map(c => c.name);
      return frameOf(rows.filter(r => cols.every(c => r[c] != null)));
    }
    case 'replace_na': {
      if (!a.column || a.value === '' || a.value == null) return frame;
      const num = Number(a.value);
      const fill = isNaN(num) ? a.value : num;
      return frameOf(rows.map(r => r[a.column] == null ? { ...r, [a.column]: fill } : r));
    }
    case 'group_by': {
      state.group = a.columns || [];
      return frame;
    }
    case 'summarize': {
      const name = a.name || autoName(a);
      const groupCols = state.group || [];
      state.group = null;
      const compute = (subset) => {
        if (a.fn === 'count') return subset.length;
        if (a.fn === 'count_distinct') {
          const s = new Set(); subset.forEach(r => r[a.column] != null && s.add(r[a.column])); return s.size;
        }
        let vs = subset.map(r => Number(r[a.column]));
        if (a.naRm !== false) vs = vs.filter(v => !isNaN(v));
        return (AGG[a.fn] || AGG.mean)(vs);
      };
      if (groupCols.length) {
        const buckets = new Map();
        for (const r of rows) {
          const key = groupCols.map(c => r[c]).join('');
          if (!buckets.has(key)) buckets.set(key, { keyVals: groupCols.map(c => r[c]), rows: [] });
          buckets.get(key).rows.push(r);
        }
        const out = [...buckets.values()].map(b => {
          const o = {};
          groupCols.forEach((c, i) => o[c] = b.keyVals[i]);
          o[name] = compute(b.rows);
          return o;
        });
        return frameOf(out);
      }
      return frameOf([{ [name]: compute(rows) }]);
    }
    case 'pivot_longer': {
      if (!a.columns?.length) return frame;
      const idCols = frame.cols.map(c => c.name).filter(n => !a.columns.includes(n));
      const namesTo = a.namesTo || 'name', valuesTo = a.valuesTo || 'value';
      const out = [];
      for (const r of rows) {
        for (const c of a.columns) {
          if (a.dropNa && r[c] == null) continue;
          const o = {};
          idCols.forEach(k => o[k] = r[k]);
          o[namesTo] = c; o[valuesTo] = r[c];
          out.push(o);
        }
      }
      return frameOf(out);
    }
    case 'pivot_wider': {
      if (!a.namesFrom || !a.valuesFrom) return frame;
      const idCols = frame.cols.map(c => c.name).filter(n => n !== a.namesFrom && n !== a.valuesFrom);
      const nameSet = new Set();
      const buckets = new Map();
      for (const r of rows) {
        const key = idCols.map(c => r[c]).join('');
        if (!buckets.has(key)) buckets.set(key, { keyVals: idCols.map(c => r[c]), vals: {} });
        const nm = String(r[a.namesFrom]);
        nameSet.add(nm);
        if (!(nm in buckets.get(key).vals)) buckets.get(key).vals[nm] = r[a.valuesFrom];
      }
      const names = [...nameSet].sort(defaultCompare);
      const out = [...buckets.values()].map(b => {
        const o = {};
        idCols.forEach((c, i) => o[c] = b.keyVals[i]);
        names.forEach(nm => o[nm] = nm in b.vals ? b.vals[nm] : null);
        return o;
      });
      return frameOf(out);
    }
    default:
      return frame;
  }
}

export function autoName(a) {
  if (a.fn === 'count') return 'n';
  return a.fn && a.column ? `${a.fn}_${a.column}` : '';
}

/* Run the full pipeline. Returns a { cols, rows } frame. */
export function runPipeline(baseFrame, steps) {
  let frame = { cols: baseFrame.cols, rows: baseFrame.rows };
  const state = { group: null };
  for (const step of steps) frame = applyStep(frame, step, state);
  // Ensure metadata reflects final rows
  if (!frame.cols.length && frame.rows.length) frame = frameOf(frame.rows);
  return frame;
}

/* Human-readable recipe (replaces the old "View SQL" modal). */
export function describePipeline(steps) {
  if (!steps.length) return '# No steps — data is unchanged.';
  const lines = ['data'];
  let group = null;
  for (const s of steps) {
    const a = s.args || {};
    switch (s.type) {
      case 'select': lines.push(`  ▸ ${a.mode === 'drop' ? 'drop' : 'keep'} columns: ${(a.columns || []).join(', ') || '(none)'}`); break;
      case 'mutate': lines.push(`  ▸ mutate ${a.name} = ${a.expression}`); break;
      case 'rename': lines.push(`  ▸ rename ${a.column} → ${a.newName}`); break;
      case 'filter': lines.push(`  ▸ filter rows where ${a.expression}`); break;
      case 'sample': lines.push(`  ▸ sample ${a.size}${a.mode === 'prop' ? ' fraction' : ' rows'}${a.replace ? ' (with replacement)' : ''}`); break;
      case 'distinct': lines.push(`  ▸ distinct on ${(a.columns || []).join(', ') || 'all columns'}`); break;
      case 'drop_na': lines.push(`  ▸ drop rows with missing values in ${(a.columns || []).join(', ') || 'any column'}`); break;
      case 'replace_na': lines.push(`  ▸ replace missing in ${a.column} with ${a.value}`); break;
      case 'group_by': group = a.columns || []; lines.push(`  ▸ group by ${(a.columns || []).join(', ')}`); break;
      case 'summarize': lines.push(`  ▸ summarize ${a.name || autoName(a)} = ${a.fn}(${a.column || ''})${group ? ` per group` : ''}`); group = null; break;
      case 'pivot_longer': lines.push(`  ▸ pivot longer: ${(a.columns || []).join(', ')} → ${a.namesTo}/${a.valuesTo}`); break;
      case 'pivot_wider': lines.push(`  ▸ pivot wider: names from ${a.namesFrom}, values from ${a.valuesFrom}`); break;
    }
  }
  return lines.join('\n');
}
