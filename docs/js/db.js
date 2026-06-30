/* ── FastStats · db.js ── DuckDB-WASM wrapper ── */
import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let conn = null;

export async function initDB() {
  const DUCKDB_CDN = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/dist/';
  const bundles = {
    mvp: { mainModule: DUCKDB_CDN + 'duckdb-mvp.wasm', mainWorker: DUCKDB_CDN + 'duckdb-browser-mvp.worker.js' },
    eh: { mainModule: DUCKDB_CDN + 'duckdb-eh.wasm', mainWorker: DUCKDB_CDN + 'duckdb-browser-eh.worker.js' }
  };
  const bundle = await duckdb.selectBundle(bundles);
  
  // Workaround for cross-origin workers (e.g. on GitHub Pages)
  const workerResponse = await fetch(bundle.mainWorker);
  const workerBlob = await workerResponse.blob();
  const workerUrl = URL.createObjectURL(workerBlob);
  const worker = new Worker(workerUrl);

  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule);
  conn = await db.connect();
  console.log('[FastStats] DuckDB-WASM initialized');
}

export async function query(sql) {
  if (!conn) throw new Error('DB not initialized');
  const result = await conn.query(sql);
  return arrowToObjects(result);
}

export async function queryRaw(sql) {
  if (!conn) throw new Error('DB not initialized');
  return conn.query(sql);
}

function arrowToObjects(table) {
  const rows = [];
  const schema = table.schema.fields.map(f => f.name);
  for (let i = 0; i < table.numRows; i++) {
    const row = {};
    for (const col of schema) {
      let v = table.getChild(col)?.get(i);
      if (v !== null && v !== undefined && typeof v === 'bigint') v = Number(v);
      row[col] = v;
    }
    rows.push(row);
  }
  return rows;
}

export async function loadCSVString(csvText, tableName) {
  await db.registerFileText(`${tableName}.csv`, csvText);
  await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${tableName}.csv', header=true, sample_size=-1)`);
}

export async function loadCSVFile(file, tableName) {
  const text = await file.text();
  await loadCSVString(text, tableName);
}

export async function loadCSVFromURL(url, tableName) {
  const resp = await fetch(url);
  const text = await resp.text();
  await loadCSVString(text, tableName);
}

export async function getSchema(tableName) {
  const rows = await query(`DESCRIBE "${tableName}"`);
  return rows.map(r => ({
    name: r.column_name,
    type: r.column_type,
    isNumeric: /INT|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|BIGINT|SMALLINT|TINYINT|HUGEINT/i.test(r.column_type),
    isDate: /DATE|TIMESTAMP|TIME/i.test(r.column_type),
    isCategorical: /VARCHAR|TEXT|CHAR|BOOL/i.test(r.column_type)
  }));
}

export async function getColumns(tableName) {
  const schema = await getSchema(tableName);
  return schema.map(s => s.name);
}

export async function getRowCount(tableName) {
  const r = await query(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
  return r[0]?.cnt ?? 0;
}

export async function getColCount(tableName) {
  const schema = await getSchema(tableName);
  return schema.length;
}

export async function tableExists(tableName) {
  try {
    await query(`SELECT 1 FROM "${tableName}" LIMIT 0`);
    return true;
  } catch { return false; }
}

export async function exportCSV(tableName) {
  const result = await queryRaw(`SELECT * FROM "${tableName}"`);
  const schema = result.schema.fields.map(f => f.name);
  let csv = schema.join(',') + '\n';
  for (let i = 0; i < result.numRows; i++) {
    const vals = schema.map(col => {
      let v = result.getChild(col)?.get(i);
      if (v == null) return '';
      v = String(v);
      if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    });
    csv += vals.join(',') + '\n';
  }
  return csv;
}

export async function createView(viewName, sql) {
  await conn.query(`CREATE OR REPLACE VIEW "${viewName}" AS ${sql}`);
}

export async function dropView(viewName) {
  try { await conn.query(`DROP VIEW IF EXISTS "${viewName}"`); } catch {}
}

export async function dropTable(tableName) {
  try { await conn.query(`DROP TABLE IF EXISTS "${tableName}"`); } catch {}
}

export function getDB() { return db; }
export function getConn() { return conn; }
