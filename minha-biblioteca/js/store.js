/* Camada de dados: estado, persistência (localStorage), backup e processamento de imagens. */
const store = {
  KEY: 'minhaBiblioteca_v3', // mesma chave das versões anteriores: livros antigos continuam funcionando
  state: { books: [], activeId: null, theme: 'classico' },

  id() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); },
  page() { return { id: this.id(), blocks: [] }; },
  block(type, align = 'left', text = '') { return { id: this.id(), type, text, align }; },
  active() { return this.state.books.find(b => b.id === this.state.activeId); },

  /** Garante no mínimo 4 páginas e quantidade par (livro aberto = 2 páginas). */
  fix(book) {
    book.pages = Array.isArray(book.pages) ? book.pages : [];
    while (book.pages.length < 4 || book.pages.length % 2) book.pages.push(this.page());
    return book;
  },

  sample() {
    const b = { id: this.id(), name: 'Meu primeiro livro', pages: [{ id: this.id(), blocks: [
      this.block('title', 'center', 'Título do livro'),
      this.block('subtitle', 'center', 'Uma história para contar'),
      this.block('section', 'center', '✦'),
      this.block('normal', 'left', 'Era uma vez…')
    ] }] };
    return this.fix(b);
  },

  load() {
    try { Object.assign(this.state, JSON.parse(localStorage.getItem(this.KEY))); } catch (e) {}
    const s = this.state;
    if (!Array.isArray(s.books) || !s.books.length) s.books = [this.sample()];
    s.books.forEach(b => this.fix(b));
    if (!this.active()) s.activeId = s.books[0].id;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.state)); return true; }
    catch (e) { return false; }
  },

  newBook() {
    const b = this.fix({ id: this.id(), name: 'Novo livro', pages: [] });
    b.pages[0].blocks.push(this.block('title', 'center'));
    this.state.books.push(b); this.state.activeId = b.id;
    return b;
  },

  exportJSON() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(this.state)], { type: 'application/json' }));
    a.download = 'biblioteca-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  /** Adiciona os livros de um backup (sem apagar os atuais). */
  async importJSON(file) {
    const d = JSON.parse(await file.text());
    if (!d || !Array.isArray(d.books) || !d.books.length) throw new Error('arquivo inválido');
    d.books.forEach(b => { b.id = this.id(); b.name = String(b.name || 'Livro importado'); this.state.books.push(this.fix(b)); });
    this.state.activeId = d.books[d.books.length - 1].id;
  },

  /** Reduz a imagem (máx. 900 px, JPEG) para caber no localStorage. Devolve uma data URL. */
  image(file, max = 900) {
    return new Promise((ok, fail) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'), x = c.getContext('2d');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .82));
      };
      img.onerror = () => fail(new Error('não foi possível ler a imagem'));
      img.src = url;
    });
  }
};
