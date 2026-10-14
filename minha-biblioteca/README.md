# 📖 Minha Biblioteca

Editor de livros que roda 100% no navegador: crie vários livros, escreva em páginas duplas, insira imagens e troque o tema. Sem servidor e sem dependências — só HTML, CSS e JavaScript.

## Recursos

- Vários livros na barra lateral (duplo clique para renomear)
- Páginas duplas: navegue pelos botões, pelas setas do teclado ou pelo número da página
- Blocos de título, subtítulo, sessão, citação e texto, além de **imagens** (botão, arrastar e soltar ou `Ctrl+V`)
- Botão direito em um bloco: mover, converter, alinhar, excluir e mudar o tamanho da imagem
- Temas Clássico, Claro e Noite; layout responsivo
- Salvamento automático, backup/restauração em `.json` e impressão / PDF

## Rodar localmente

Abra o `index.html` no navegador. Se preferir um servidor local: `python -m http.server`.

## Publicar no GitHub Pages

```bash
git init
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/minha-biblioteca.git
git push -u origin main
```

Depois, no repositório: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Em cerca de um minuto o site fica em `https://SEU-USUARIO.github.io/minha-biblioteca/`.

## Onde ficam os dados

Os livros ficam no `localStorage` do navegador (cerca de 5 MB), separados por aparelho e por endereço do site. As imagens são reduzidas (máx. 900 px) para economizar espaço. Use **Backup** para baixar seus livros e **Importar** para levá-los a outro navegador ou endereço — inclusive ao trocar de `file://` para o GitHub Pages.

## Estrutura

```
index.html       página principal
css/style.css    estilos e temas
js/store.js      dados: estado, localStorage, backup, imagens
js/app.js        interface: páginas, blocos, menus, atalhos
```

## Atalhos

`←` `→` trocam de página · `Enter` cria um bloco · `Backspace` em bloco vazio o remove · `Ctrl+S` salva
