/* ── FastStats · md-editor.js ── WYSIWYG Markdown editor ──
 *
 * Notion / Apple Notes-style editing: the user types normally and formatting
 * appears live. Two ways to format:
 *   1. Markdown shortcuts, applied automatically as you type:
 *      "# " → H1 … "### " → H3, "- " → bullet, "1. " → numbered, "> " → quote,
 *      "```" → code block, "---"+Enter → divider, **bold**, *italic*, `code`, ~~strike~~.
 *   2. A toolbar (and Cmd/Ctrl+B / I) acting on the current selection.
 * The document is serialized back to clean Markdown for export.
 */
import { el, debounce } from './utils.js';
import { loadMarked } from './lazy.js';
import { icon } from './icons.js';

const ZW = '​'; // zero-width space used to park the caret after inline marks

export function createMdEditor(container, item, { onChange = null } = {}) {
  const wrap = el('div', { className: 'mde' });
  const toolbar = el('div', { className: 'mde-toolbar', role: 'toolbar', 'aria-label': 'Text formatting' });
  const area = el('div', {
    className: 'mde-area md-block',
    contenteditable: 'true',
    spellcheck: 'true',
    'data-placeholder': 'Type here — try “# ”, “- ”, “1. ”, “> ”, **bold** or *italic*…',
  });
  const hint = el('div', { className: 'mde-hint' },
    'Markdown auto-formats as you type: # heading · - list · 1. list · > quote · **bold** · *italic* · `code`');
  wrap.append(toolbar, area, hint);
  container.append(wrap);

  /* ── Toolbar ── */
  const exec = (cmd, val = null) => { area.focus(); document.execCommand(cmd, false, val); scheduleSync(); refreshToolbar(); };
  const curBlockTag = () => {
    const b = currentBlock(area);
    return b ? b.tagName : '';
  };
  const heading = (tag) => exec('formatBlock', curBlockTag() === tag ? 'P' : tag);
  const btns = [
    { label: 'H1', title: 'Heading 1', run: () => heading('H1'), state: () => curBlockTag() === 'H1' },
    { label: 'H2', title: 'Heading 2', run: () => heading('H2'), state: () => curBlockTag() === 'H2' },
    { label: 'H3', title: 'Heading 3', run: () => heading('H3'), state: () => curBlockTag() === 'H3' },
    null,
    { icon: 'bold', title: 'Bold (Ctrl+B)', run: () => exec('bold'), state: () => document.queryCommandState('bold') },
    { icon: 'italic', title: 'Italic (Ctrl+I)', run: () => exec('italic'), state: () => document.queryCommandState('italic') },
    { icon: 'strike', title: 'Strikethrough', run: () => exec('strikeThrough'), state: () => document.queryCommandState('strikeThrough') },
    { icon: 'code', title: 'Inline code', run: toggleInlineCode },
    null,
    { icon: 'listUl', title: 'Bulleted list', run: () => exec('insertUnorderedList'), state: () => document.queryCommandState('insertUnorderedList') },
    { icon: 'listOl', title: 'Numbered list', run: () => exec('insertOrderedList'), state: () => document.queryCommandState('insertOrderedList') },
    { icon: 'quote', title: 'Quote', run: () => exec('formatBlock', curBlockTag() === 'BLOCKQUOTE' ? 'P' : 'BLOCKQUOTE'), state: () => curBlockTag() === 'BLOCKQUOTE' },
    null,
    { icon: 'link', title: 'Link', run: addLink },
    { label: '—', title: 'Divider', run: () => exec('insertHorizontalRule') },
    { icon: 'eraser', title: 'Clear formatting', run: () => { exec('removeFormat'); exec('formatBlock', 'P'); } },
  ];
  const btnEls = [];
  btns.forEach(b => {
    if (!b) { toolbar.append(el('span', { className: 'mde-sep' })); return; }
    const btn = el('button', {
      className: 'mde-btn', type: 'button', title: b.title, 'aria-label': b.title,
      innerHTML: b.icon ? icon(b.icon) : b.label,
    });
    // mousedown so the text selection is not lost before the command runs
    btn.addEventListener('mousedown', e => { e.preventDefault(); b.run(); });
    btnEls.push([btn, b]);
    toolbar.append(btn);
  });

  function refreshToolbar() {
    for (const [btn, b] of btnEls) {
      if (!b.state) continue;
      let on = false;
      try { on = !!b.state(); } catch {}
      btn.classList.toggle('active', on);
    }
  }
  document.addEventListener('selectionchange', () => {
    if (area.contains(document.getSelection()?.anchorNode)) refreshToolbar();
  });

  function toggleInlineCode() {
    const sel = document.getSelection();
    if (!sel || !area.contains(sel.anchorNode)) return;
    const inCode = closestTag(sel.anchorNode, 'CODE', area);
    if (inCode) { // unwrap
      const parent = inCode.parentNode;
      while (inCode.firstChild) parent.insertBefore(inCode.firstChild, inCode);
      inCode.remove();
    } else if (!sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      const code = document.createElement('code');
      try { r.surroundContents(code); } catch { return; }
    }
    scheduleSync();
  }

  function addLink() {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !area.contains(sel.anchorNode)) { return alert('Select some text first, then add the link.'); }
    const url = prompt('Link URL:', 'https://');
    if (url) exec('createLink', url);
  }

  /* ── Auto-format: block rules on Space / Enter ── */
  area.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); exec('bold'); return; }
      if (k === 'i') { e.preventDefault(); exec('italic'); return; }
    }
    if (e.key === ' ') { if (applyBlockRule()) e.preventDefault(); }
    else if (e.key === 'Enter' && !e.shiftKey) { if (applyEnterRule()) e.preventDefault(); }
    else if (e.key === 'Tab') {
      const sel = document.getSelection();
      if (sel && closestTag(sel.anchorNode, 'LI', area)) {
        e.preventDefault();
        exec(e.shiftKey ? 'outdent' : 'indent');
      }
    }
  });

  function caretInfo() {
    const sel = document.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode || !area.contains(sel.anchorNode)) return null;
    const block = currentBlock(area);
    if (!block) return null;
    const r = document.createRange();
    r.setStart(block, 0);
    r.setEnd(sel.anchorNode, sel.anchorOffset);
    return { sel, block, prefixRange: r, prefix: r.toString().replace(new RegExp(ZW, 'g'), '') };
  }

  function applyBlockRule() {
    const c = caretInfo();
    if (!c || closestTag(c.sel.anchorNode, 'PRE', area)) return false;
    const p = c.prefix;
    let action = null;
    // Deterministic DOM transforms — execCommand list/quote insertion is
    // unreliable here (Chrome can merge the empty block into its neighbour).
    const inList = c.block.tagName === 'LI';
    if (inList) return false;
    if (/^#{1,6}$/.test(p)) action = b => morphBlock(b, document.createElement('h' + p.length));
    else if (p === '-' || p === '*' || p === '+') action = b => listify(b, 'ul');
    else if (/^\d+[.)]$/.test(p)) action = b => listify(b, 'ol');
    else if (p === '>') action = b => wrapBlock(b, 'blockquote');
    else if (p === '```') action = b => morphBlock(b, document.createElement('pre'));
    if (!action) return false;
    c.prefixRange.deleteContents();
    action(c.block);
    scheduleSync();
    return true;

    function moveChildren(from, to) {
      while (from.firstChild) to.append(from.firstChild);
      // Empty text nodes left by the prefix deletion make the element look
      // non-empty; ensure a <br> so the caret has a valid position inside.
      if (!to.textContent && !to.querySelector('br,img')) {
        to.textContent = '';
        to.appendChild(document.createElement('br'));
      }
    }
    function morphBlock(block, repl) {
      moveChildren(block, repl);
      block.replaceWith(repl);
      placeCaret(repl);
    }
    function listify(block, kind) {
      const list = document.createElement(kind);
      const li = document.createElement('li');
      moveChildren(block, li);
      list.append(li);
      block.replaceWith(list);
      placeCaret(li);
    }
    function wrapBlock(block, kind) {
      const q = document.createElement(kind);
      const inner = document.createElement('p');
      moveChildren(block, inner);
      q.append(inner);
      block.replaceWith(q);
      placeCaret(inner);
    }
  }

  function applyEnterRule() {
    const c = caretInfo();
    if (!c) return false;
    // Enter on an empty list item exits the list (splitting it if necessary)
    const li = c.block.tagName === 'LI' ? c.block : closestTag(c.sel.anchorNode, 'LI', area);
    if (li && !li.textContent.replace(new RegExp(ZW, 'g'), '').trim() && !li.querySelector('ul,ol,img')) {
      const list = li.parentElement;
      const p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      if (li.nextElementSibling) {
        const rest = list.cloneNode(false);
        while (li.nextSibling) rest.append(li.nextSibling);
        list.after(p, rest);
      } else {
        list.after(p);
      }
      li.remove();
      if (!list.querySelector('li')) list.remove();
      placeCaret(p);
      scheduleSync();
      return true;
    }
    // "---" / "***" + Enter → horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(c.block.textContent.trim()) && c.block.tagName !== 'LI') {
      c.block.textContent = '';
      document.execCommand('insertHorizontalRule');
      document.execCommand('insertParagraph');
      scheduleSync();
      return true;
    }
    // Enter in a code block exits it when the current line is empty
    const pre = closestTag(c.sel.anchorNode, 'PRE', area);
    if (pre && /\n$/.test(pre.textContent) && c.sel.anchorOffset === (c.sel.anchorNode.textContent || '').length) {
      const para = document.createElement('p');
      para.innerHTML = '<br>';
      pre.after(para);
      placeCaret(para);
      scheduleSync();
      return true;
    }
    return false;
  }

  /* ── Auto-format: inline rules (**bold**, *italic*, `code`, ~~strike~~) ── */
  area.addEventListener('input', e => {
    setEmptyFlag();
    if (e.inputType === 'insertText' && e.data && '*`~_'.includes(e.data)) applyInlineRules();
    scheduleSync();
  });

  const INLINE_RULES = [
    { re: /\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, tag: 'strong', mark: 2 },
    { re: /__([^_\s](?:[^_]*[^_\s])?)__$/, tag: 'strong', mark: 2 },
    { re: /~~([^~\s](?:[^~]*[^~\s])?)~~$/, tag: 's', mark: 2 },
    { re: /`([^`]+)`$/, tag: 'code', mark: 1 },
    { re: /(^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*$/, tag: 'em', mark: 1, group: 2 },
    { re: /(^|[^_])_([^_\s](?:[^_]*[^_\s])?)_$/, tag: 'em', mark: 1, group: 2 },
  ];

  function applyInlineRules() {
    const sel = document.getSelection();
    if (!sel || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3 || !area.contains(node)) return;
    if (closestTag(node, 'CODE', area) || closestTag(node, 'PRE', area)) return;
    const upto = node.textContent.slice(0, sel.anchorOffset);
    for (const rule of INLINE_RULES) {
      const m = upto.match(rule.re);
      if (!m) continue;
      const content = m[rule.group || 1];
      const full = rule.group ? m[0].slice(m[1].length) : m[0];
      const start = sel.anchorOffset - full.length;
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, sel.anchorOffset);
      r.deleteContents();
      const elx = document.createElement(rule.tag);
      elx.textContent = content;
      r.insertNode(elx);
      // park the caret in a zero-width text node after the mark so typing continues unformatted
      const after = document.createTextNode(ZW);
      elx.after(after);
      const nr = document.createRange();
      nr.setStart(after, 1);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
      return;
    }
  }

  /* Paste: keep it plain text (Markdown in the clipboard auto-formats on next edit; keeps HTML junk out) */
  area.addEventListener('paste', e => {
    const text = e.clipboardData?.getData('text/plain');
    if (text == null) return;
    e.preventDefault();
    document.execCommand('insertText', false, text);
  });

  function setEmptyFlag() {
    area.dataset.empty = area.textContent.replace(new RegExp(ZW, 'g'), '').trim() || area.querySelector('img,hr,li') ? '' : '1';
  }

  /* ── Load initial content & sync back to the item ── */
  const sync = () => {
    const clone = area.cloneNode(true);
    clone.querySelectorAll('.mde-hint').forEach(n => n.remove());
    const html = clone.innerHTML.replace(new RegExp(ZW, 'g'), '');
    item.html = `<div class="md-block">${html}</div>`;
    item.md = htmlToMd(clone);
    item.text = item.md;
    if (onChange) onChange(item);
  };
  const scheduleSync = debounce(sync, 200);

  (async () => {
    if (!(item.md || '').trim()) { area.innerHTML = '<p><br></p>'; setEmptyFlag(); return; }
    try {
      // Prefer marked (full CommonMark), but never hang or lose content if the
      // CDN is unreachable — fall back to the built-in mini parser.
      const marked = await Promise.race([
        loadMarked(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
      ]);
      area.innerHTML = marked.parse(item.md);
    } catch {
      area.innerHTML = miniMdToHtml(item.md);
    }
    sync(); // keep item.html populated even if the user never edits
    setEmptyFlag();
  })();

  return { el: wrap, area, sync };
}

/* ── Helpers ── */
function currentBlock(area) {
  const sel = document.getSelection();
  let n = sel?.anchorNode;
  if (!n || !area.contains(n)) return null;
  while (n && n !== area) {
    if (n.nodeType === 1 && /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(n.tagName)) return n;
    n = n.parentNode;
  }
  return null;
}

function closestTag(node, tag, stop) {
  let n = node;
  while (n && n !== stop) {
    if (n.nodeType === 1 && n.tagName === tag) return n;
    n = n.parentNode;
  }
  return null;
}

function placeCaret(elx) {
  const sel = document.getSelection();
  const r = document.createRange();
  r.setStart(elx, 0);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

/* ── Minimal Markdown → HTML (fallback when marked can't load; handles the
      subset this editor emits: headings, lists, quotes, code, hr, inline marks) ── */
function miniMdToHtml(md) {
  const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = md.split('\n');
  let html = '', list = null, pre = false, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, '');
    if (pre) { if (/^```/.test(l)) { html += '</pre>'; pre = false; } else html += escapeHtml(raw) + '\n'; continue; }
    let m;
    if (/^```/.test(l)) { flushPara(); closeList(); html += '<pre>'; pre = true; }
    else if ((m = l.match(/^(#{1,6}) (.*)/))) { flushPara(); closeList(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
    else if ((m = l.match(/^[-*+] (.*)/))) { flushPara(); if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)] (.*)/))) { flushPara(); if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^> ?(.*)/))) { flushPara(); closeList(); html += `<blockquote><p>${inline(m[1])}</p></blockquote>`; }
    else if (/^(-{3,}|\*{3,})$/.test(l)) { flushPara(); closeList(); html += '<hr>'; }
    else if (!l.trim()) { flushPara(); closeList(); }
    else para.push(l);
  }
  if (pre) html += '</pre>';
  flushPara(); closeList();
  return html || '<p><br></p>';
}

/* ── HTML → Markdown serializer (covers everything the editor can produce) ── */
export function htmlToMd(root) {
  const md = blockChildren(root, '');
  return md.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function blockChildren(node, listPrefix) {
  let out = '';
  for (const c of node.childNodes) out += blockToMd(c, listPrefix);
  return out;
}

function blockToMd(n, listPrefix) {
  if (n.nodeType === 3) { const t = cleanText(n.textContent); return t.trim() ? t + '\n\n' : ''; }
  if (n.nodeType !== 1) return '';
  const tag = n.tagName;
  const inl = () => inlineToMd(n).trim();
  switch (tag) {
    case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6':
      return '#'.repeat(+tag[1]) + ' ' + inl() + '\n\n';
    case 'P': case 'DIV': {
      // A wrapper containing block children must recurse, not flatten to inline text
      if (n.querySelector(':scope > ul, :scope > ol, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > blockquote, :scope > pre, :scope > table, :scope > p, :scope > div, :scope > hr')) {
        return blockChildren(n, listPrefix);
      }
      const t = inl();
      return t ? t + '\n\n' : '';
    }
    case 'BR': return '\n';
    case 'HR': return '---\n\n';
    case 'UL': case 'OL': return listToMd(n, '') + '\n';
    case 'BLOCKQUOTE': {
      const inner = blockChildren(n, '').trim() || inl();
      return inner.split('\n').map(l => '> ' + l).join('\n') + '\n\n';
    }
    case 'PRE': return '```\n' + cleanText(n.textContent).replace(/\n$/, '') + '\n```\n\n';
    case 'TABLE': return tableToMd(n) + '\n';
    case 'IMG': return `![${n.alt || ''}](${n.getAttribute('src') || ''})\n\n`;
    default: {
      const t = inl();
      return t ? t + '\n\n' : '';
    }
  }
}

function listToMd(list, indent) {
  const ordered = list.tagName === 'OL';
  let out = '', i = 1;
  for (const li of list.children) {
    if (li.tagName !== 'LI') continue;
    let text = '', nested = '';
    for (const c of li.childNodes) {
      if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) nested += listToMd(c, indent + '  ');
      else if (c.nodeType === 1 && /^(P|DIV)$/.test(c.tagName)) text += inlineToMd(c);
      else text += inlineToMd(c);
    }
    out += `${indent}${ordered ? `${i}.` : '-'} ${text.trim()}\n${nested}`;
    i++;
  }
  return out;
}

function tableToMd(table) {
  const rows = [...table.querySelectorAll('tr')].map(tr =>
    [...tr.children].map(td => inlineToMd(td).trim().replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const head = rows[0];
  let out = `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n`;
  for (const r of rows.slice(1)) out += `| ${r.join(' | ')} |\n`;
  return out;
}

function inlineToMd(node) {
  if (node.nodeType === 3) return cleanText(node.textContent);
  if (node.nodeType !== 1) return '';
  const inner = [...node.childNodes].map(inlineToMd).join('');
  switch (node.tagName) {
    case 'STRONG': case 'B': return inner.trim() ? `**${inner.trim()}**` : '';
    case 'EM': case 'I': return inner.trim() ? `*${inner.trim()}*` : '';
    case 'S': case 'DEL': case 'STRIKE': return inner.trim() ? `~~${inner.trim()}~~` : '';
    case 'CODE': return '`' + cleanText(node.textContent) + '`';
    case 'A': return `[${inner || node.getAttribute('href')}](${node.getAttribute('href') || ''})`;
    case 'BR': return '  \n';
    case 'IMG': return `![${node.alt || ''}](${node.getAttribute('src') || ''})`;
    default: return inner;
  }
}

function cleanText(t) {
  return (t || '').replace(new RegExp(ZW, 'g'), '').replace(/ /g, ' ');
}
