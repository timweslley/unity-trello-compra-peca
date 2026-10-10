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

## Feito no servidor (07/10/2026, sessão do servidor)

- O formulário marca a chamada com `?quadro=principal` (em `chamarServidorLeitura`). Com essa marca, `POST /api` só aceita
  `vdf_iniciar`, `vdf_abrir`, `vdf_buscarPlaca` e `vdf_carregarCard`; qualquer outra função volta `{ok:false}` (o formulário
  cai no Apps Script, como previsto). Sem a marca, `/api` continua sendo o formulário do TESTE.
- As leituras do principal rodam num **trabalhador separado** (fila própria, não espera o TESTE) com `VD_BOARD = oH4TbTqb` e em
  **modo só leitura**: toda chamada ao Trello que não seja GET é recusada pelo próprio servidor; nada é gravado no banco
  (propriedades, abas) nem na planilha; gatilhos e e-mail são ignorados.
- A **descrição completa** (aba TRAVA) e o **cadastro de fornecedores** (aba FORNECEDORES) são lidos **ao vivo** da planilha real a
  cada chamada (a planilha é compartilhada como Leitor com o servidor) — nada de cópia velha. Memória e cache do trabalhador
  são zerados a cada chamada.
- Diagnóstico: `/tarefas/execucoes` mostra cada chamada com `quadro: "principal"`, tempo e chamadas por destino.
- **Conferido 07/10/2026 23:25** (versão `dd46c44`), 3 cards do principal mais recentes, mesma chamada nos dois caminhos:
  `vdf_carregarCard` servidor 1,4–4,0 s × Apps Script 6,2–14,6 s; `vdf_iniciar` 0,23 s × 3,1 s (resposta idêntica).
  Resposta do card idêntica em tudo, exceto 1 linha do cadastro de fornecedores cujo **nome é uma data** na planilha
  (o Google devolve o texto da data, o servidor o número) — linha sem uso; corrigir na planilha se quiser.
  `vdf_salvar` com `?quadro=principal` → recusado (`ok:false`), como combinado.

## ⚠️ Desligado em 09/10/2026 16:10 (sessão do formulário) — pedido para a sessão do servidor

**Sintoma (2 cards hoje, TBU8D71 e BAT9F19):** a aba Autorizar mostrava "sem cotação lançada" com a cotação já no card.
`vdf_carregarCard` pelo **servidor** (`?quadro=principal`) voltou `cotacoes: []`; a mesma chamada pelo **Apps Script** voltou as
3 cotações; a aba TRAVA da planilha **tem** as cotações na coluna E (conferido pelo gviz às 16:08). Ou seja: o servidor lê uma
cópia velha da descrição completa.

**Causa provável:** `servidor/src/gas/trabalhador.ts` guarda as abas em memória (`const ABAS = new Map()` em `linhasDa`) e só
chama `aba.ler` na primeira vez; se o trabalhador do principal vive entre chamadas, a TRAVA fica congelada. (A nota acima diz
que memória e cache são zerados a cada chamada — na prática não está acontecendo, ou há outro cache no caminho `aba.ler` →
`lerAbaPlanilha`.) O `CacheService` emulado também vive na memória do trabalhador por até 6 h — para esse, o Apps Script já
guarda o hash da vitrine junto com a completa (`vd_completa_(cardId, vitrine)`, 09/10/2026) e descarta a cópia quando a
vitrine do Trello mudou; mas isso não resolve a aba em memória.

**Como reproduzir:** na página do formulário, no console:
`fetch(PU_CFG.URL_SERVIDOR + '?quadro=principal', {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({fn:'vdf_carregarCard', args:[TOKEN,'PikLFvQH']})}).then(r=>r.json()).then(j=>console.log(j.r.cotacoes))`
e comparar com `chamarGoogle('vdf_carregarCard', [TOKEN,'PikLFvQH'])`.

**O que precisa:** em modo só leitura do principal, reler a TRAVA (e a FORNECEDORES) a cada chamada — ou pelo menos a linha
do card pedido — e zerar `ABAS`/`CACHE` do trabalhador por chamada de verdade. Quando estiver corrigido e conferido com um
card que acabou de receber cotação, religar em `powerup/config.js` (`LEITURA_SERVIDOR: 'todos'`).

### Corrigido 09/10/2026 (sessão do servidor)

Causa real: não era a aba em memória (`ABAS` já era zerada a cada chamada) — eram as **variáveis globais do robô**. No Apps Script
`VD_CMP_MEM` (descrição completa "lida uma vez por execução"), `VD_ACOES`, `DU_CACHE`, `QT_PARTES` etc. nascem de novo a cada
execução; no servidor o trabalhador vive entre chamadas e elas guardavam o valor da primeira leitura. Agora o trabalhador guarda o
valor inicial de cada global do robô e o devolve antes de toda execução (TESTE e principal) — `servidor/src/gas/trabalhador.ts`,
teste `variável global do robô nasce de novo` em `servidor/test/gas.test.ts`.

**Conferido 09/10/2026 16:25** (versão `f72afe5`): `vdf_carregarCard` em 10 cards do principal mexidos hoje (inclusive BAT9F19), servidor ×
Google: cotações, peças, autorizações e totais **iguais**. Única diferença: `anexos[].lido` (o servidor não enxerga as propriedades
`VD_ANX3_` do Apps Script) — só muda o texto "(pode levar alguns segundos)" ao reler um anexo. **Religado para todos** em `powerup/config.js`.

## Propriedades reais do principal (10/10/2026, Weslley autorizou)

O contexto do principal no servidor usava as Propriedades do banco do TESTE — as sugestões de **local de estoque** e **quem retira**
(abas Recebimento/Retirada, novas de 10/10) vinham vazias. Agora o Apps Script tem `vdf_propsServidor` (só leitura, só as chaves de
`VDF_PROPS_SERVIDOR`, nunca token; exige membro do quadro) e o servidor pede a ele, guarda 5 min e entrega ao trabalhador a cada
chamada. Diagnóstico: `/tarefas/execucoes` → `propsPrincipal`. Conferido 10/10 13:50: 4 cards do principal iguais ao Google
(locais 8/8, quem retira 2/2; só `anexos[].lido` difere), `vdf_iniciar` igual. No principal só existem hoje RC_LOCAIS, RC_QUEM,
TST_CARDS e VD_FIXO — compradores, autorizadores e financeiro usam o padrão do código (igual nos dois).
