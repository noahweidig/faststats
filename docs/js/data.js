/* ── FastStats · data.js ── Dataset loading & management ── */
import { loadCSVFromURL, loadCSVString, setTable, getSchema, getRowCount, getColumnValues as engineColumnValues } from './engine.js';
import { loadSheetJS } from './lazy.js';

export const SAMPLE_DATASETS = {
  iris: {
    label: 'Sample: Iris flower measurements',
    name: 'Iris flower measurements',
    description: '150 iris flowers with sepal and petal measurements plus species labels.',
    file: 'data/iris.csv'
  },
  gapminder: {
    label: 'Sample: Gapminder global development',
    name: 'Gapminder global development',
    description: 'Country-level life expectancy, GDP per capita, and population from 1952 to 2007.',
    file: 'data/gapminder.csv'
  },
  penguins: {
    label: 'Sample: Palmer Penguins',
    name: 'Palmer Penguins',
    description: 'Size measurements for 344 adult penguins from three species on three islands in the Palmer Archipelago, Antarctica.',
    file: 'data/penguins.csv'
  },
  mtcars: {
    label: 'Sample: Motor Trend car specs',
    name: 'Motor Trend car specs',
    description: '32 automobiles from the 1974 Motor Trend US magazine with fuel economy and performance metrics.',
    file: 'data/mtcars.csv'
  }
};

const TABLE_NAME = 'active_data';

export function getTableName() { return TABLE_NAME; }

export async function loadSampleDataset(id) {
  const ds = SAMPLE_DATASETS[id];
  if (!ds) throw new Error(`Unknown sample dataset: ${id}`);
  await loadCSVFromURL(ds.file, TABLE_NAME, { header: true });
  return { id, name: ds.name, description: ds.description, sourceType: 'sample' };
}

export async function loadUploadedFile(file, hasHeader = true) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await loadSheetJS();
    const data = new Uint8Array(await file.arrayBuffer());
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(ws);
    loadCSVString(csv, TABLE_NAME, { header: hasHeader });
  } else {
    const text = await file.text();
    loadCSVString(text, TABLE_NAME, { header: hasHeader });
  }

  return {
    id: 'upload', name: file.name,
    description: `Data imported from ${file.name}.`,
    sourceType: 'upload'
  };
}

export async function getDatasetInfo(meta) {
  const schema = getSchema(TABLE_NAME);
  const rowCount = getRowCount(TABLE_NAME);
  const colCount = schema.length;
  const numericCols = schema.filter(s => s.isNumeric).map(s => s.name);
  const categoricalCols = schema.filter(s => s.isCategorical).map(s => s.name);
  const dateCols = schema.filter(s => s.isDate).map(s => s.name);
  return { ...meta, schema, rowCount, colCount, numericCols, categoricalCols, dateCols, allCols: schema.map(s => s.name) };
}

export function getColumnValues(tableName, colName, limit = 1000) {
  return engineColumnValues(tableName, colName, limit);
}
