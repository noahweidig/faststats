/* ── FastStats · grid.js ── Lightweight sortable/paginated data grid ──
 * Zero dependencies. Replaces AG Grid (whose CDN bundle 404'd) with a small,
 * fast, themed table: click headers to sort, paginate large frames, quick filter.
 */
import { el } from './utils.js';

export function createGrid(container, { columns, rows, pageSize = 50 } = {}) {
  let sortKey = null;
  let sortDir = 1;
  let page = 0;
  let filter = '';
  let filtered = rows;

  container.innerHTML = '';
  container.classList.add('fs-grid');

  const toolbar = el('div', { className: 'fs-grid-toolbar' });
  const search = el('input', { type: 'search', className: 'fs-grid-search', placeholder: 'Filter rows…' });
  const info = el('div', { className: 'fs-grid-info' });
  toolbar.append(search, info);

  const scroller = el('div', { className: 'fs-grid-scroll' });
  const table = el('table', { className: 'fs-grid-table' });
  scroller.append(table);

  const pager = el('div', { className: 'fs-grid-pager' });

  container.append(toolbar, scroller, pager);

  function applyFilter() {
    if (!filter) { filtered = rows; return; }
    const f = filter.toLowerCase();
    filtered = rows.filter(r => columns.some(c => {
      const v = r[c.field];
      return v != null && String(v).toLowerCase().includes(f);
    }));
  }

  function sortedRows() {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const x = a[sortKey], y = b[sortKey];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
      return String(x).localeCompare(String(y)) * sortDir;
    });
    return arr;
  }

  function render() {
    applyFilter();
    const data = sortedRows();
    const total = data.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (page >= pages) page = pages - 1;
    if (page < 0) page = 0;
    const start = page * pageSize;
    const slice = data.slice(start, start + pageSize);

    // Header
    const thead = el('thead');
    const htr = el('tr');
    columns.forEach(c => {
      const arrow = sortKey === c.field ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const th = el('th', { className: sortKey === c.field ? 'sorted' : '' }, (c.headerName || c.field) + arrow);
      th.addEventListener('click', () => {
        if (sortKey === c.field) sortDir = -sortDir;
        else { sortKey = c.field; sortDir = 1; }
        render();
      });
      htr.append(th);
    });
    thead.append(htr);

    // Body
    const tbody = el('tbody');
    slice.forEach(r => {
      const tr = el('tr');
      columns.forEach(c => {
        const v = r[c.field];
        const td = el('td', { className: typeof v === 'number' ? 'num' : '' }, v == null ? '' : String(v));
        tr.append(td);
      });
      tbody.append(tr);
    });

    table.innerHTML = '';
    table.append(thead, tbody);

    info.textContent = `${total.toLocaleString()} row${total === 1 ? '' : 's'} · ${columns.length} cols`;

    // Pager
    pager.innerHTML = '';
    if (pages > 1) {
      const mk = (label, target, disabled) => {
        const b = el('button', { className: 'fs-grid-page-btn' }, label);
        if (disabled) b.disabled = true;
        else b.addEventListener('click', () => { page = target; render(); });
        return b;
      };
      pager.append(
        mk('« First', 0, page === 0),
        mk('‹ Prev', page - 1, page === 0),
        el('span', { className: 'fs-grid-page-label' }, `Page ${page + 1} of ${pages}`),
        mk('Next ›', page + 1, page === pages - 1),
        mk('Last »', pages - 1, page === pages - 1),
      );
    }
  }

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filter = search.value.trim(); page = 0; render(); }, 150);
  });

  render();

  return {
    destroy() { container.innerHTML = ''; container.classList.remove('fs-grid'); },
    update(newRows) { rows = newRows; page = 0; render(); },
  };
}
