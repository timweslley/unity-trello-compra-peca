# Power-Up "Pedido de Peça Unity"

Popup dentro do Trello para o formulário de pedido/cotação/compra de peça.

- `index.html` — conector (o Trello carrega escondido). Registra:
  - `card-buttons` — **Editar peças** e **Cotação / Compra** no menu "Power-ups" do card;
  - `card-detail-badges` — chips laranja clicáveis logo abaixo do título do card;
  - `card-back-section` — seção "Pedido de Peça Unity" no corpo do card (`secao.html`);
  - `board-buttons` — **Novo pedido** no topo do quadro.
  Nos cards fixos (AVISO / NOVO PEDIDO DE PEÇA) só aparece **Novo pedido**.
- `secao.html` — conteúdo da seção do card: botões grandes + resumo (nº de peças na
  descrição, coluna, última alteração pelo formulário). Suporta tema escuro.
- `form.html` — casca do popup: faz o login no Trello uma única vez
  (`t.getRestApi().authorize`) e embute o formulário do Apps Script com o token
  (`?pu=1`; o formulário avisa por `postMessage` quando conclui / precisa de login / fechar).
- `formulario.html` — **o formulário em si**, estático (gerado a partir de `apps-script/Formulario.html`:
  mesmo HTML, com `chamar()` trocado por `fetch` ao `doPost` do Apps Script e `google.script.url`
  por `lerLocal()`). Abre em ~0,5 s; os dados vêm numa chamada só (`vdf_abrir`, ~2–3 s).
  O link antigo do Apps Script (`…/exec`) continua funcionando.
- `config.js` — URL do web app (`URL_APP`, servidor), URL do formulário estático (`URL_FORM`) e
  chave de API do Trello (a mesma do Apps Script).
- `icone-*.svg` — ícones dos botões; `icone-app.svg` é o ícone do Power-Up
  (o Trello o mostra em cinza na seção do card, por isso é um glifo simples).

Servido pelo GitHub Pages: `https://timweslley.github.io/unity-trello-compra-peca/powerup/`

Cadastro no Trello: https://trello.com/power-ups/admin → Power-Up "Pedido de Peça Unity"
(id `6ab590e85a6c2057d55011b9`) → URL do conector = `.../powerup/index.html` →
capacidades `card-buttons`, `card-detail-badges`, `card-back-section` e `board-buttons`
→ na chave de API usada em `config.js`, incluir `https://timweslley.github.io`
em *Allowed origins*.

Observação: o Trello só instancia os iframes dos Power-Ups quando a aba está
visível (em aba em segundo plano o menu "Power-ups" fica em "carregando").

Versões do Apps Script: v15 = popup (27/09/2026); v16 = API JSON `doPost`; v17 = `vdf_abrir` em paralelo (`fetchAll`).
