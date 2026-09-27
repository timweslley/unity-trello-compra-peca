# Power-Up "Pedido de Peça Unity"

Popup dentro do Trello para o formulário de pedido/cotação/compra de peça.

- `index.html` — conector (o Trello carrega escondido). Registra os botões
  **Editar peças** e **Cotação / Compra** no card e **Novo pedido** no quadro.
- `form.html` — casca do popup: faz o login no Trello uma única vez
  (`t.getRestApi().authorize`) e embute o formulário do Apps Script com o token.
- `config.js` — URL do web app e chave de API do Trello (a mesma do Apps Script).
- `icone-*.svg` — ícones dos botões.

Servido pelo GitHub Pages: `https://timweslley.github.io/unity-trello-compra-peca/powerup/`

Cadastro no Trello: https://trello.com/power-ups/admin → novo Power-Up →
URL do conector = `.../powerup/index.html` → capacidades `card-buttons` e
`board-buttons` → na aba **API key**, incluir `https://timweslley.github.io`
em *Allowed origins* da chave usada em `config.js`.
