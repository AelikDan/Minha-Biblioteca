/* Interface: renderização do livro, edição de blocos, menus e atalhos. Depende de store.js. */
const $ = s => document.querySelector(s);
const PH = { title: 'Título…', subtitle: 'Subtítulo…', section: 'Sessão…', quote: 'Citação…', normal: 'Escreva aqui…' };
let spread = 0, focus = null, timer = null; // spread = par de páginas visível; focus = {p, id} do último bloco focado

/* ---------- salvar ---------- */
function status(kind, msg) { $('#dot').className = 'dot ' + kind; $('#status').textContent = msg; }
function sched() { status('busy', 'Salvando…'); clearTimeout(timer); timer = setTimeout(commit, 700); }
function commit() {
  clearTimeout(timer); collect();
  if (store.save()) status('ok', 'Salvo'); else status('', 'Sem espaço no navegador. Baixe um backup.');
}
/** Copia o texto digitado (DOM) para o estado. */
function collect() {
  const bk = store.active(); if (!bk) return;
  document.querySelectorAll('#stage .block[data-bid]').forEach(el => {
    const b = bk.pages[+el.dataset.p]?.blocks.find(x => x.id === el.dataset.bid);
    if (b && b.type !== 'image') b.text = el.textContent;
  });
}
/** Altera o estado, redesenha e devolve o foco ao bloco `id`. */
function mutate(fn, id) {
  collect(); fn(); renderStage(); sched();
  const el = id && $(`#stage [data-bid="${id}"]`);
  if (el) { el.focus(); if (el.isContentEditable) placeEnd(el); }
}
function placeEnd(el) {
  const r = document.createRange(), s = getSelection();
  r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r);
}

/* ---------- desenho ---------- */
function renderAll() { renderSidebar(); renderStage(); }

function renderSidebar() {
  const list = $('#book-list'); list.innerHTML = '';
  store.state.books.forEach(b => {
    const it = document.createElement('div');
    it.className = 'item' + (b.id === store.state.activeId ? ' active' : '');
    it.dataset.id = b.id;
    it.innerHTML = '<i>📖</i><span></span><button class="x" data-act="del-book" title="Excluir livro">×</button>';
    it.querySelector('span').textContent = b.name;
    list.append(it);
  });
}

function renderStage() {
  const bk = store.active(), st = $('#stage'), total = bk.pages.length, last = total / 2 - 1;
  spread = Math.max(0, Math.min(spread, last));
  const L = spread * 2;
  st.innerHTML = `
    <div class="nav">
      <button class="btn round" data-act="prev" aria-label="Páginas anteriores" ${spread ? '' : 'disabled'}>‹</button>
      <span>Página <input class="jump" id="jump" type="number" min="1" max="${total}" value="${L + 1}"> de ${total}</span>
      <button class="btn round" data-act="next" aria-label="Próximas páginas" ${spread < last ? '' : 'disabled'}>›</button>
    </div>
    <div class="book" id="book">
      <section class="pg l"><div class="pg-in" data-p="${L}"></div><i class="num">${L + 1}</i></section>
      <section class="pg r"><div class="pg-in" data-p="${L + 1}"></div><i class="num">${L + 2}</i></section>
    </div>`;
  [L, L + 1].forEach(p => fill(st.querySelector(`.pg-in[data-p="${p}"]`), bk.pages[p], p));
  fit();
}

/** Ajusta o tamanho do livro à tela (2 × 360 por 500 px, como no CSS). */
function fit() {
  const b = $('#book'), st = $('#stage'); if (!b) return;
  b.style.zoom = Math.max(.4, Math.min(1.25, (st.clientWidth - 56) / 720, (st.clientHeight - 130) / 500));
}

function fill(el, page, p) {
  if (!page.blocks.length) {
    el.innerHTML = '<div class="empty"><b>✦</b><span>Página em branco</span><small>Clique para começar a escrever</small></div>';
    el.firstChild.onclick = () => { const nb = store.block('normal'); mutate(() => page.blocks.push(nb), nb.id); };
    return;
  }
  page.blocks.forEach(b => el.append(mkBlock(b, p)));
}

/** Elemento estático do bloco (usado na tela e na impressão). */
function blockEl(b) {
  const el = document.createElement('div');
  el.className = `block block-${b.type} align-${b.align || 'left'}`;
  el.dataset.bid = b.id;
  if (b.type === 'image') {
    if (String(b.src).startsWith('data:image/')) {
      const img = new Image(); img.src = b.src; img.alt = ''; img.style.width = (b.size || 70) + '%'; el.append(img);
    }
  } else { el.dataset.ph = PH[b.type] || ''; el.textContent = b.text || ''; }
  return el;
}

function mkBlock(b, p) {
  const el = blockEl(b); el.dataset.p = p;
  if (b.type === 'image') el.tabIndex = 0;
  else { el.contentEditable = 'true'; el.spellcheck = true; el.oninput = sched; }
  el.onfocus = () => { focus = { p, id: b.id }; };
  el.onkeydown = e => onKey(e, b, p);
  el.oncontextmenu = e => { e.preventDefault(); menu(e, b, p); };
  return el;
}

function onKey(e, b, p) {
  const pg = store.active().pages[p], i = pg.blocks.findIndex(x => x.id === b.id), img = b.type === 'image';
  if (e.key === 'Enter' && !e.shiftKey && !img) {
    e.preventDefault();
    const nb = store.block('normal', b.align);
    mutate(() => pg.blocks.splice(i + 1, 0, nb), nb.id);
  } else if ((e.key === 'Backspace' || e.key === 'Delete') && (img || (e.key === 'Backspace' && !e.target.textContent && pg.blocks.length > 1))) {
    e.preventDefault();
    const next = (pg.blocks[i - 1] || pg.blocks[i + 1])?.id;
    mutate(() => pg.blocks.splice(i, 1), next);
  }
}

/* ---------- inserir / editar ---------- */
/** Bloco atualmente em foco (já com o texto sincronizado). */
function cur() {
  collect();
  return focus ? store.active().pages[focus.p]?.blocks.find(b => b.id === focus.id) || null : null;
}
function insertBlock(nb) {
  const bl = store.active().pages[focus ? focus.p : spread * 2].blocks;
  const i = focus ? bl.findIndex(x => x.id === focus.id) : -1;
  mutate(() => bl.splice(i < 0 ? bl.length : i + 1, 0, nb), nb.id);
}
async function addImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try { insertBlock({ id: store.id(), type: 'image', src: await store.image(file), size: 70, align: 'center' }); }
  catch (e) { alert('Imagem não adicionada: ' + e.message); }
}
async function importFile(f) {
  if (!f) return;
  try { commit(); await store.importJSON(f); spread = 0; focus = null; renderAll(); store.save(); }
  catch (e) { alert('Não foi possível importar: ' + e.message); }
}
function printBook() {
  commit();
  const out = $('#print'); out.innerHTML = '';
  store.active().pages.filter(pg => pg.blocks.length).forEach(pg => {
    const d = document.createElement('div'); d.className = 'pp';
    pg.blocks.forEach(b => d.append(blockEl(b))); out.append(d);
  });
  print();
}

/* ---------- livros e navegação ---------- */
function selectBook(id) {
  commit(); store.state.activeId = id; spread = 0; focus = null;
  $('#sidebar').classList.remove('open'); renderAll(); store.save();
}
function go(d) { commit(); spread += d; focus = null; renderStage(); }
function rename(id, el) {
  const bk = store.state.books.find(b => b.id === id); if (!bk) return;
  const inp = document.createElement('input'); inp.className = 'rename'; inp.value = bk.name;
  el.replaceWith(inp); inp.focus(); inp.select();
  inp.onblur = () => { bk.name = inp.value.trim() || bk.name; renderSidebar(); commit(); };
  inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = bk.name; inp.blur(); } };
}

/* ---------- menu de contexto (botão direito no bloco) ---------- */
function menu(e, b, p) {
  closeMenu();
  const pg = store.active().pages[p], i = pg.blocks.findIndex(x => x.id === b.id), img = b.type === 'image';
  const set = (k, v) => () => mutate(() => { b[k] = v; }, b.id);
  const move = d => () => {
    const j = i + d; if (j < 0 || j >= pg.blocks.length) return;
    mutate(() => { [pg.blocks[i], pg.blocks[j]] = [pg.blocks[j], pg.blocks[i]]; }, b.id);
  };
  const items = [
    ['Mover para cima', move(-1)], ['Mover para baixo', move(1)], null,
    ...(img
      ? [['Tamanho pequeno', set('size', 35)], ['Tamanho médio', set('size', 60)], ['Tamanho grande', set('size', 100)]]
      : [['Virar título', 'title'], ['Virar subtítulo', 'subtitle'], ['Virar sessão', 'section'], ['Virar citação', 'quote'], ['Virar texto normal', 'normal']]
          .map(([l, t]) => [l, set('type', t)])),
    null,
    ['Alinhar à esquerda', set('align', 'left')], ['Alinhar ao centro', set('align', 'center')], ['Alinhar à direita', set('align', 'right')], null,
    ['Excluir bloco', () => mutate(() => pg.blocks.splice(i, 1)), true]
  ];
  const m = document.createElement('div'); m.id = 'ctx';
  items.forEach(it => {
    if (!it) return m.append(document.createElement('hr'));
    const btn = document.createElement('button'); btn.textContent = it[0];
    if (it[2]) btn.className = 'danger';
    btn.onclick = () => { closeMenu(); it[1](); };
    m.append(btn);
  });
  document.body.append(m);
  m.style.left = Math.max(8, Math.min(e.clientX, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(e.clientY, innerHeight - m.offsetHeight - 8)) + 'px';
}
function closeMenu() { $('#ctx')?.remove(); }

/* ---------- ações dos botões (data-act) ---------- */
const ACT = {
  'new-book'() {
    commit(); const b = store.newBook(); spread = 0; focus = null; renderAll(); store.save();
    const s = $(`.item[data-id="${b.id}"] span`); if (s) rename(b.id, s);
  },
  'del-book'(t) {
    const id = t.closest('.item').dataset.id, s = store.state;
    if (s.books.length === 1) return alert('Não é possível excluir o único livro.');
    if (!confirm('Excluir este livro permanentemente?')) return;
    commit(); s.books = s.books.filter(b => b.id !== id);
    if (s.activeId === id) { s.activeId = s.books[0].id; spread = 0; focus = null; }
    renderAll(); store.save();
  },
  'toggle-sidebar'() { $('#sidebar').classList.toggle('open'); },
  block(t) {
    const f = cur(), type = t.dataset.type;
    if (f && f.type !== 'image' && !f.text.trim()) mutate(() => { f.type = type; }, f.id); // bloco vazio vira o novo tipo
    else insertBlock(store.block(type));
  },
  align(t) { const f = cur(); if (f) mutate(() => { f.align = t.dataset.v; }, f.id); },
  image() { $('#file-img').click(); },
  'add-pages'() { const bk = store.active(); mutate(() => { bk.pages.splice(spread * 2 + 2, 0, store.page(), store.page()); spread++; focus = null; }); },
  'del-pages'() {
    const bk = store.active();
    if (bk.pages.length <= 4) return alert('O livro precisa ter pelo menos 4 páginas.');
    if (confirm('Excluir estas duas páginas e o que está escrito nelas?')) mutate(() => { bk.pages.splice(spread * 2, 2); focus = null; });
  },
  backup() { commit(); store.exportJSON(); },
  restore() { $('#file-json').click(); },
  print() { printBook(); },
  prev() { go(-1); },
  next() { go(1); }
};

document.addEventListener('click', e => {
  closeMenu();
  const t = e.target.closest('[data-act]');
  if (t) return ACT[t.dataset.act]?.(t);
  const it = e.target.closest('.item');
  if (it && e.target.tagName !== 'INPUT') selectBook(it.dataset.id);
});
$('#book-list').ondblclick = e => { const s = e.target.closest('.item span'); if (s) rename(s.closest('.item').dataset.id, s); };

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'jump') {
    const v = parseInt(t.value, 10);
    if (v >= 1 && v <= store.active().pages.length) { commit(); spread = Math.floor((v - 1) / 2); focus = null; renderStage(); }
  } else if (t.id === 'theme') {
    document.documentElement.dataset.theme = store.state.theme = t.value; store.save();
  } else if (t.id === 'file-img') { addImage(t.files[0]); t.value = ''; }
  else if (t.id === 'file-json') { importFile(t.files[0]); t.value = ''; }
});

/* colar (texto puro ou imagem) e arrastar imagens para a página */
document.addEventListener('paste', e => {
  const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); addImage(f); }
  else if (e.target.isContentEditable) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }
});
const hasFiles = e => e.dataTransfer?.types?.includes('Files');
document.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
document.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); [...e.dataTransfer.files].forEach(addImage); });

/* atalhos */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); commit(); }
  if (e.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
});
addEventListener('resize', fit);
addEventListener('pagehide', commit);

/* início */
store.load();
document.documentElement.dataset.theme = store.state.theme;
$('#theme').value = store.state.theme;
renderAll();
