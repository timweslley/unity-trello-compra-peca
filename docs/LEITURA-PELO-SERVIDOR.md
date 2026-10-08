# Leitura pelo servidor no quadro principal — pedido para a sessão do servidor

**07/10/2026 · pedido do Weslley: "a velocidade tem impactado o uso pela equipe".**

## O que o formulário já faz (commit desta nota, `tools/estatico_chamar.js`)

No quadro **principal** (`oH4TbTqb`, sem `srv=1`), as chamadas de **leitura de navegação** passam a ir primeiro ao
servidor próprio (`PU_CFG.URL_SERVIDOR` = `…/api`), e só depois ao Apps Script:

| função | o que é | por onde vai |
|---|---|---|
| `vdf_iniciar` | login + unidades | servidor → Google se falhar |
| `vdf_abrir` | abertura do formulário (listas, cadastro de fornecedores) | servidor → Google se falhar |
| `vdf_buscarPlaca` | busca de placa | servidor → Google se falhar |
| `vdf_carregarCard` | abrir um card (descrição, cotações, checklists, anexos, campos) | servidor → Google se falhar |
| todas as outras (gravações, OCR, `vdf_lerFornecimento*`, `vdf_textoAnexo`…) | | **só Google**, como hoje |

- Mesmo protocolo de hoje: `POST` com corpo `{"fn": "...", "args": [...]}` (texto), resposta `{"ok": true, "r": ...}` ou
  `{"ok": false, "erro": "..."}`. O primeiro argumento é o **token Trello do usuário** (o formulário manda igual ao Google).
- **Volta automática**: se o servidor não responder em **8 s**, devolver HTTP ≥ 400, resposta inválida ou `ok:false`
  (inclusive "quadro não permitido"), a chamada segue para o Apps Script sem a pessoa perceber. Então ligar o formulário
  antes de o servidor estar pronto não quebra nada — só custa o tempo da recusa.
- Ligado **por usuário** em `powerup/config.js` → `LEITURA_SERVIDOR: { usuarios: [...] }` (hoje: `timweslley`,
  `christianfarias23`); `'todos'` libera a equipe. A decisão é guardada no navegador depois do login
  (`vd_leitura_srv`), por isso `vdf_iniciar` da abertura seguinte já vai ao servidor.
- Medição local: `localStorage.vd_tempos` (últimas 60 chamadas: hora, função, `srv`/`google`, ms, ok) — para comparar
  os dois caminhos no console.

## O que o servidor precisa aceitar

1. `POST /api` com `fn` ∈ {`vdf_iniciar`, `vdf_abrir`, `vdf_buscarPlaca`, `vdf_carregarCard`} **para o quadro principal**
   (`oH4TbTqb`) — são só leituras do Trello; a proteção contra gravação fora do TESTE continua valendo para todo o resto.
   Se hoje a recusa é por quadro, abrir exceção só para essas 4 funções.
2. A resposta tem de ser **igual** à do Apps Script para a mesma chamada (o formulário não muda). O código copiado na
   fase 3a já garante isso, desde que as leituras do Trello usem um token com acesso ao principal e a "planilha no banco"
   tenha o cadastro de fornecedores do principal (`vdf_abrir` devolve a lista).
3. CORS para `https://timweslley.github.io` (já existe para o TESTE).
4. Meta: `vdf_carregarCard` em < 1,5 s (p95); hoje no Google é 1–4 s e, em 10–17 % das vezes, 30 s–2 min.

## Plano de liberação

- Amanhã cedo: servidor aceitando as 4 leituras no principal → já vale para Weslley e Christian (config atual).
- Algumas horas sem diferença → `LEITURA_SERVIDOR: 'todos'` (só editar o config.js; o Pages publica em 1 min).
- Etapa seguinte (ganho extra): servir essas leituras pelo **espelho** (banco), em vez de reler o Trello a cada abertura.
