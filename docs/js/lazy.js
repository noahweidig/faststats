/* ── FastStats · lazy.js ── On-demand script loading ──
 * Heavy libraries (Plotly ~4.5 MB, SheetJS) are only fetched when the user
 * actually opens the Plot tab or uploads an Excel file — keeping first paint
 * instant. Each loader resolves the global the library exposes.
 */

const cache = new Map();

function loadScript(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(s);
  });
  cache.set(url, p);
  return p;
}

export async function loadPlotly() {
  if (window.Plotly) return window.Plotly;
  await loadScript('https://cdn.plot.ly/plotly-2.35.2.min.js');
  if (!window.Plotly) throw new Error('Plotly failed to initialize');
  return window.Plotly;
}

export async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');
  if (!window.XLSX) throw new Error('SheetJS failed to initialize');
  return window.XLSX;
}

export async function loadMarked() {
  if (window.marked) return window.marked;
  await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
  if (!window.marked) throw new Error('marked failed to initialize');
  window.marked.setOptions({ breaks: true, gfm: true });
  return window.marked;
}
