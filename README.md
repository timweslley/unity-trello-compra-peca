# Unity — Trello "Compra de Peça": robô, formulário e Power-Up

Fonte do projeto Apps Script **"Log de Descricao Trello"** (id `1sV_VMM5fUPxBmaExaWHAYdaw4Xda9-ebtKr2BD2iwabG4hxLodE50W6c`)
e do Power-Up do Trello que abre o formulário dentro do card.

| Pasta | O que é |
|---|---|
| `apps-script/` | Código do projeto Apps Script (robô de validação, formulário web, prazos, relatório diário, trava da descrição). Cada arquivo corresponde a um arquivo do projeto. |
| `powerup/` | Página conectora do Power-Up (GitHub Pages) — botões no card que abrem o formulário em modal. |

## Estado
- Robô e formulário rodam no quadro definido na propriedade `VD_BOARD` do script (hoje o quadro de **TESTE** `ZX4gRmnX`). Quadro real `oH4TbTqb` só quando o Weslley liberar — basta trocar a propriedade.
- Versões publicadas do web app: ver *Implantar → Gerenciar implantações* no Apps Script. Cada tag deste repositório corresponde a uma versão publicada.

## Como restaurar uma versão
1. `git checkout <tag>`;
2. copiar o conteúdo de cada arquivo de `apps-script/` para o arquivo de mesmo nome no editor do Apps Script;
3. salvar e publicar nova versão (*Implantar → Gerenciar implantações → Editar → Nova versão*).

## Propriedades do script (configuração)
`VD_BOARD`, `VD_MODO` (ATIVO/OBSERVAR), `VD_LIGADO` (SIM/NAO), `VD_URL_FORM`, `VD_COMPRADORES` (usernames que podem registrar compra), `VD_TRAVA_DESC` (NAO desliga a trava da descrição), `TRELLO_KEY`/`TRELLO_TOKEN`.
