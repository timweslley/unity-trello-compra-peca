# Quem está mexendo em quê (sessões do Claude)

Duas sessões trabalham neste repositório. **Ler no começo e atualizar no fim de cada sessão.** Antes de mexer em área
da outra, deixar um recado aqui e no commit.

| Área | Dona | Arquivos | Observação |
|---|---|---|---|
| Sistema atual (quadro principal, robô Apps Script, formulário do principal) | sessão "principal" (`session_01Ai6vA1XhngqNJoRAtdQEHG`) | `apps-script/**`, `powerup/config.js`, `tools/**` | publicar no principal só com testes passando e confirmação do Weslley |
| Versão 2.0 (servidor, banco, quadro TESTE, visual do celular `srv=1`) | sessão "servidor" (`session_01Y4tyLcET1od5jWa86cF21v`) | `servidor/**`, `.github/workflows/servidor.yml`, `docs/PROJETO-SERVIDOR.md`, `docs/VERSAO-2.0.md`, bloco "VERSÃO 2.0 — CELULAR" no fim de `apps-script/Formulario.html` | o servidor recopia `apps-script/` sozinho a cada publicação |
| Módulo Cilia (API oficial, 1 rodada/dia → schema `cilia` + PDFs no Drive) | sessão "rotina Unity" (`session_01V3UsjLPFDHbDqsEXaHXecZ`) | `cilia/**`, `.github/workflows/cilia.yml` | não toca `servidor/`; usa o mesmo projeto GCP, a conta `compra-peca-run` e o mesmo Postgres em schema próprio `cilia` |
| Orçamentos dos portais (HDI, SOMA) para o robô — tradutores no PC | sessão "servidor" (`session_01Y4tyLcET1od5jWa86cF21v`) | `portais/**` | base na pasta `Rotina Unity/Orçamentos/HDI` (e `…/SOMA`) do Drive; o robô lê pelo `CiliaApi.gs` (`CL_BASES`) |
| Leitura do principal pelo servidor | combinada | `tools/estatico_chamar.js` (cliente) × `servidor/src/index.ts` `/api?quadro=principal` | ver `docs/LEITURA-PELO-SERVIDOR.md` |

## Em andamento
- 16/10 18h40 — **sessão "servidor"** (Weslley 17h21: "siga com alinhamento celular… usar gpt e gemini"): formulário 2.0 no
  **celular** (só `srv=1`, TESTE) alinhado ao computador — barra de cima numa linha com menu ⋯, avisos e resumo em Detalhes,
  tipo do pedido curto, placa só leitura na edição, leitura de anexo recolhida, abas numa faixa, rodapé numa linha, recebimento
  que abre ao marcar Chegou (commits `f9ce077` e `97b6859`; avaliação do GPT e do Gemini em 2 rodadas). Proposta do sistema
  próprio no Google (sem Trello) escrita pelo Fable e publicada como documento para o Weslley decidir — nada construído.
- 16/10 17h — **sessão "servidor"** (Weslley 16h59, print do ARW5715 no TESTE: "botão excluir tá aparecendo assim"): no formulário
  2.0 (só `srv=1`), a linha de ações da peça da diretoria (Excluir, Comp., Não comprar, Obs., p/ particular) passava por cima do "?"
  e do fim dos tipos. Agora a 2.0 mede cada peça (`acoesCabem`): se não cabe, aperta como no zoom de 125%; se ainda não cabe, os
  botões descem para a linha de baixo. Nada muda na tela clássica do principal.
- 16/10 15h30 — **sessão "servidor"** (Weslley 15h21: "verifica e se for caso pode fazer", placas com 2 cards abertos): **TAN7H81**
  — o card "TAN7H81 CRONOS BRANCO BRADESCO" (25/05, sem O.S. e sem peça) era do mesmo carro e sinistro do card da O.S. 878
  (Mourão): orçamento do Cilia de 02/06, NF FIPAL 180216 e fotos copiados para o da O.S. 878, comentário nos dois e o de 25/05
  arquivado (só quadro; nada no código). **TLH0A28** — não unifiquei: são duas ordens diferentes (O.S. 472, manutenção de maio, e
  O.S. 1001, sinistro SURA de julho); o desempate pela seguradora do `CiliaApi.gs` põe o PDF do Cilia no card SURA.
- 16/10 15h20 — **sessão "servidor"** (OK do Weslley às 15h16 no plano do AYK0H85: "pode seguir"): `CiliaApi.gs` — com 2+ cards
  abertos da placa, desempata pela seguradora no fim do título (só se um card bater) e, sem desempate, tenta de novo por até 3 dias
  (antes desistia na hora; marcas antigas "vários cards" voltam para a fila na próxima leitura da base). No quadro: o card
  "AYK0H85 FIESTA PRATA PARTICULAR" (aberto por engano em 13/10) foi unificado no da O.S. 1891 (checklist PAGAS PARTICULAR +
  comentário) e arquivado; o robô anexa o PDF final da Bradesco (1964521.3) no card da O.S. 1891 na próxima leitura.
- 16/10 12h — **recado da sessão "servidor" para a "principal"** (Weslley 11h16, NPG5429: "verifica se não era peças de
  complemento autorizado pelo orçamentista (antes da aut da seguradora) se for o robô precisa entender isso e não duplicar peça
  já comprada"): mexi no `Complemento.gs` — `cp_conhecidas_` passa a ler também o checklist **COMPLEMENTO** do jeito antigo
  (compra do complementar antes da autorização) e `cp_comparar_` conta como já tem o código que está num checklist de compra
  (PAGAS…, COMPLEMENTO) **antes** do casamento pela descrição (`textosCompra`). Teste no simulador com o caso real.
- 16/10 08h — **sessão "servidor"**: tradutor do SOMA pronto (`portais/pc/soma-base.mjs` + teste com dados inventados), conferido
  com o relatório real de 16/10 (3 peças da oficina e 7 FO, totais iguais aos do relatório). Cópia em `Rotina Unity/ferramentas`; a
  tarefa agendada da madrugada passa a rodar o tradutor depois de guardar o `Websoma_<PLACA>.txt` (alimenta só
  `Orçamentos/SOMA/SOMA-HOJE.json`). **O robô continua sem ler a base do SOMA** (`CLS_LIGADO` padrão NAO) e a rotina segue anexando
  o PDF do SOMA como antes. Nada mudou em `apps-script/`.
- 15/10 18h10 — **recado da sessão "servidor" para a "principal" e a "rotina Unity"** (OK do Weslley às 17h57: "1 liga / 2 unidade"):
  **base HDI LIGADA no principal** (`CL_BASES` HDI `padrao: 'SIM'`; `CLH_LIGADO=NAO` desliga) — a 1ª leitura registra "li a base do HDI"
  e só trata laudo que mudar dali em diante; a rotina da madrugada passa a só alimentar `Orçamentos/HDI/HDI-HOJE.json` (skills salvas
  15h29). **Totais × quantidade ligados no principal** (`vd_totaisPorQtd_` padrão SIM; `VD_TOTAIS_QTD=NAO` desliga). Mexi também na
  parte clássica do `Formulario.html` (só isso): `textoTotais` multiplica pela QTD (`CARD.totaisQtd`, novo em `vdf_carregarCard`) e o
  campo da cotação diz "Valor unitário (R$) · orç. unit." na peça com mais de 1 unidade.
- 15/10 18h — **recado da sessão "servidor" para todas**: a publicação do servidor (workflow "Servidor") ficou **presa das 13h53 às
  17h52** na montagem da imagem (`b6bbdf0`); as publicações seguintes ficaram na fila e foram canceladas uma pela outra. Cancelei a
  presa; `9b80f64` foi publicado no Cloud Run às ~18h com tudo o que entrou em `apps-script/` à tarde (inclusive `bae9763` e `1aa9a56`).
  Quem testou pelo servidor (quadro TESTE ou leitura do principal) entre 13h53 e 18h estava com o código de 13h52. O workflow agora tem
  tempo máximo (30 min na publicação, 15 na imagem — `3fc7a9b`).
- 15/10 16h — **recado da sessão "servidor" para a "principal"**: na aba PAINEL da planilha do robô (atualizada 15/10 07:44), a linha
  "Peças recebidas" (seção 1) aparece como **10600%** — o número (106) ficou com o formato `0%` da linha de baixo ("Recebidas no
  prazo"). O `pn_atualizar()` atual não põe % nessa linha; vale conferir se o formato vem de uma versão antiga ou de regra que o
  `clearFormats()` não limpa. Não mexi no `Painel.gs`.
- 15/10 16h — sessão "servidor": 2ª rodada do GPT e do Gemini nas telas 2.0 (só `srv=1`, quadro TESTE) — linha nova em branco
  neutra, atalho do que falta com zoom alto, "Orç. unit." e total da peça com 2 unidades, "Cancelar", legenda "* obrigatório",
  situação travada na peça recebida (commit 2ff568f). Nada muda na tela clássica do principal.
- 15/10 15h — **recado da sessão "servidor" para a "principal" e a "rotina Unity"** (Weslley 13h52: "a rotina de orçamentos também
  contempla HDI e SOMA, pra fazermos em uma etapa apenas os anexos e lançamentos"): `CiliaApi.gs` passou a tratar **três bases**
  (`CL_BASES`: Cilia, HDI, SOMA) com a mesma fila e as mesmas regras; o Cilia segue igual (testes t1–t3 do simulador), **HDI e SOMA
  desligadas no principal** (`CLH_LIGADO`/`CLS_LIGADO`, padrão NAO). Pasta nova `portais/` (tradutor `hdi-base.mjs` do HTML do portal
  HDI → `Rotina Unity/Orçamentos/HDI/HDI-HOJE.json`; cópia em `Rotina Unity/ferramentas`). `Anexos.gs`: com a base HDI ligada, o batismo guarda
  "laudo <v>" do PDF da rotina. Versão esperando o card nascer: tenta a cada 15 min (antes, a cada ciclo). Teste HDI no TESTE
  (`CL.TESTE_V='3'`) roda sozinho quando achar a base.
- 15/10 15h — **recado da sessão "servidor" para a "rotina Unity"** (Weslley: "colocar Cilia dentro da mesma pasta, vamos organizar
  melhor nossas pastas"): a pasta `Rotina Unity/Cilia` (compartilhada com sistema@) foi **renomeada para `Rotina Unity/Orçamentos`**, com
  as subpastas `Cilia` (o conteúdo de antes — mesmos arquivos, mesmos ids no Drive), `HDI` e `SOMA`. Mudei `cilia/pc/rodar.ps1`,
  `instalar.ps1`, o comentário do `sincronizar-pc.mjs` e o `cilia/README.md`; no PC, `%USERPROFILE%\UnityCilia\rodar.ps1` já aponta
  para a pasta nova (cópia do anterior em `rodar.ps1.antes-15-10`). O "ç" vai como `[char]0x00E7` (o PowerShell 5 lê .ps1 sem BOM
  como ANSI).
- 15/10 14h — **`CiliaApi.gs` LIGADO no principal** (OK do Weslley: "podemos seguir com 1"): `CL.LIGADO_PADRAO = 'SIM'`; sinistro HDI não recebe PDF do Cilia; card em ENTREGUES/ENCERRADO/PENDÊNCIA recebe o anexo sem comentário; `ax_batizarLido_` guarda o nº da versão do Cilia no nome. Desligar: propriedade `CL_LIGADO=NAO`.
- 15/10 12h30 — **recado da sessão "servidor" (01Y4…) para a "principal"** (Weslley: "pode montar quando der", 13/10, e "pode seguir com o trabalho", 15/10): mexi em `apps-script/` para ligar a base da API do Cilia ao robô — arquivo novo `CiliaApi.gs` (anexa o PDF oficial da versão autorizada no card da placa e leva as peças da API; **desligado no principal**: `CL_LIGADO` padrão `NAO`; teste automático uma vez no quadro TESTE por `CL.TESTE_V`, sem notificar ninguém, sem segurar a trava do ciclo) e ganchos pequenos e inertes enquanto desligado: `Validacao.gs` (`VD_BOARD_FORCA` em `vd_board_`, `VD_SEM_MENCOES` em `vd_api_`, peças da API em `vd_lerAnexoTrello_` só quando existe `CL_PEC_<anexo>`, duas partes novas no ciclo) e `Anexos.gs` (`ax_batizarLido_` guarda o nº da versão do Cilia no nome só com a API ligada ou em anexo da API). Registro na aba "CILIA API" da planilha do robô.
- 11/10 15h30 — **recado da sessão "rotina Unity" para a "principal"** (Weslley autorizou: "pode fazer"): mexi em `apps-script/` — `Complemento.gs` (não importa PDF do Cilia em card HDI nem orçamento em card RETORNO; linha "REFATURAMENTO/REEMBOLSO…" não é peça; `cp_aplicar_` aceita `semComentario`), `Validacao.gs` (laudo HDI "Peças em processo de cotação" = `r.doc 'LAUDO_HDI'`; ciclo chama `cr_executar_`) e `Corretivo.gs` novo (correção única dos cards BXZ4J84, SDX5I55, BBV0H58, BAT9F19, FOB8723 lidos errado na rotina de 11/10; marca `CR_20261011=FEITO`; o arquivo pode ser apagado depois).
- 11/10 13h40 — rotina Unity: módulo `cilia/` (Cloud Run Job `cilia-sync`, imagem no repositório `servidor` do Artifact Registry). Aguarda o Weslley criar os segredos `CILIA_TOKEN_*` e o Drive compartilhado.
- 08/10 23:20 — servidor (a pedido do Weslley): `powerup/config.js` LEITURA_SERVIDOR = 'todos' (leitura do principal pelo servidor para a equipe toda; interface sem mudança). Acompanhar 09/10 no /painel.
- 08/10 — servidor: versão 2.0 passo 1 (retrato dos pedidos do TESTE no banco), painel `/painel`, mapa `docs/README.md`.

## 16/10 19h20 — fotos do card no topo do formulário 2.0 (TESTE)
- Weslley: "a capa no pedido, pode implementar no 2.0 … não só a capa, mas um carrossel que vai exibindo as fotos do card".
- Topo (computador 104×60, celular 64×44), ao lado da placa: fotos anexadas ao card, capa primeiro (selo CAPA), troca sozinha a cada 4 s
  (para com mouse/foco em cima e com "menos movimento"), setas no computador, contador 2/4. Clique abre a foto grande com miniaturas,
  setas do teclado e "Usar como capa" (troca a capa do card no Trello na hora). Card sem foto: caixa "Sem foto" (abre o botão Capa do pedido).
- Servidor: vdf_fotosCard (previews do Trello ≥300 px em data URL, cache 6 h, até 12 fotos), vdf_fotoCard (≥1000 px), vdf_definirCapa.
- Só com srv=1 (quadro TESTE). Teste: /tmp/claude-0/t/fotos/teste.mjs (computador e celular).

## 16/10 21h30 — cotação indisponível na compra (2.0, TESTE) — Weslley: "esse fluxo está confuso"
- Simulado de ponta a ponta no TESTE (card ZZT9C51, placa fictícia = sem notificar ninguém). Achados: (1) o comentário
  "COTAÇÃO INDISPONÍVEL" não dizia qual era a cotação nova; (2) na autorização a nova aparecia misturada com as outras, sem
  ligação com a que caiu (e vinha marcada a mais barata, não a do comprador); (3) eram dois envios separados na compra
  ("Enviar para nova autorização" + "Enviar compra") e, depois do 1º, o card saía de AUTORIZADO COMPRA e as outras peças
  autorizadas não podiam mais ser compradas; (4) o tipo da cotação nova vinha sempre GENUÍNO.
- Feito (só 2.0/TESTE; no principal fica como estava até a migração): um botão só ("Enviar compra e indisponível") — registra
  primeiro a compra das outras peças (parcial) e depois a indisponível; comentário com peça, cotação que caiu, motivo e a cotação
  nova; na autorização, aviso amarelo "a cotação autorizada ficou indisponível… cotação nova do comprador…" com a nova já marcada
  e selo "cotação nova"; tipo da nova já vem o da cotação autorizada. Servidor: vd_cotacoesDaDescricao_ marca q.nova nas cotações
  do bloco RECOTAÇÃO.
## 16/10 22h–00h — teste completo para a migração (Weslley: "teste tudo, 100%… use orçamentos, status prints…")
- **Leitor do robô (vale no principal)**: regressão no corpus de treino (519 textos; 116 mudaram com `18018c6`): 129 valores
  passaram ao líquido impresso, 64 peças recuperadas, nenhuma perdida. Ajustes: sigla PPOI; sinistro do Cilia (número sozinho
  depois de "Orçamento <versão> - <data>"); horário ("DAS 8H00") e câmbio+ano ("AUT 2020") não viram placa; seguradoras PIER e
  COONECTA; operação da linha seguinte e "2º código+GENUÍNA" não vazam na descrição.
- **Status do Pedido do Cilia (vale no principal)**: item do card com código com espaço ("71198 T7AJ00") não casava e caía
  no leitor genérico (fornecedor "EM COTACAO" ou "06/10/26"); fornecedor sem "/" ou grudado em "PREVISÃO DE ENTREGA";
  carimbo "dd/mm - hh:mm Entregue" grudado; peça com código curto ("6899") casa pela descrição sem trocar o código do card;
  peça ainda em cotação não herda fornecedor/previsão das outras.
- **Autorização**: total da mensagem/comentário multiplica pela quantidade (era R$ 230 com LÍQUIDO 4 × R$ 40).
- **Formulário 2.0**: aviso FALTA DADOS só antes da cotação; aviso "sem código" some ao digitar; tela Enviado sem a coluna
  velha; selo "📦 entregue no Cilia" na leitura do fornecimento.
- Ciclo real no TESTE pelo servidor (ZZT9B01, orçamento Allianz real): cotação → autorização → duas indisponíveis (uma com
  cotação nova, outra sem → EM COTAÇÃO) → recotação → autorização com a nova destacada → compra com anexo → recebimento →
  fornecimento pelo Status do Pedido → retirada. Anexo do pedido e da compra sobem pelo servidor (`getParents`).
## 17/10 04h — VIRADA da 2.0 no principal (Weslley 03h57: "1 faça já / 2 sem cobertura não entra pra compra / 3 fazer imediatamente")
- **Passo 1 ligado** (`9e646f9`): `powerup/config.js` `QUADROS_V2: ['oH4TbTqb']` → o Power-Up abre o formulário com `v2=1`
  (visual e telas 2.0, gravações no Apps Script); `Validacao.gs` `VD_V2_PRINCIPAL = true` (comportamentos 2.0 do robô no principal).
  Conferido abrindo ARW5715 (pedido e recebimento) e FMH9I78 (fornecimento) sem gravar. **Voltar:** tirar o principal de
  QUADROS_V2 e `VD_V2_PRINCIPAL = false`.
- **SEM COBERTURA**: itens do bloco "ITENS DO TIPO SEM COBERTURA" do Cilia ficam fora da leitura (até o próximo "ITENS DO TIPO"
  ou "RESUMO GERAL"); 8 orçamentos do corpus conferidos.
- **Passo 2 construído, desligado** (`8be59c4`, `3c50f05`): gravações do principal pelo servidor com as propriedades e a planilha
  REAIS do robô do Google — `vdf_servidorProps` (Apps Script, só a conta do robô), trabalhador `principalGrava` (e `testeRemoto`
  para conferir: `/api?quadro=testeremoto`), cópia das propriedades renovada em segundo plano, devolução em segundo plano e em
  ordem (a TRAVA só confere descrição com mais de 40 s), planilha ao vivo (linhas novas por append), falha na planilha não
  interrompe e fica em `guardado` (`planilha_pendente_*`). Formulário: `PU_CFG.GRAVACAO_SERVIDOR` por usuário (vazio). Testado no
  TESTE (recebimento real: comentário, checklist, descrição e assinatura VD_DESC no Apps Script). **Falta:** planilha como Editor
  para `compra-peca-run` (hoje Leitor → 403 nas gravações da planilha); depois ligar só para timweslley, conferir e liberar.
- 17/10 04h35 — planilha do robô como **Editor** para `compra-peca-run` (Weslley). Gravação da planilha conferida no TESTE
  (`testeRemoto`, recebimento sem erro). `GRAVACAO_SERVIDOR: { usuarios: ['timweslley'] }` — **ligado só para o Weslley**.
  Proteção de escrita passou a conferir o quadro do trabalhador (`b28da12`). Primeira gravação real no principal pelo servidor:
  `vdf_definirCapa` no ARW5715 (mesma capa) em 1 s. Próximo: acompanhar as gravações dele em `/tarefas/execucoes`
  (quadro `principalGrava`) e liberar 'todos'.
- 17/10 04h40 — **liberado para todos** (Weslley 04h35: "já coloca pra todo mundo e não esquece o celular"): `GRAVACAO_SERVIDOR: 'todos'`. Celular conferido (iPhone/Android abrem a 2.0 com `v2=1`). Pendências de devolução aparecem no `/saude` (`pendentesGravacao`). **Desligar:** `GRAVACAO_SERVIDOR: { usuarios: [] }` (1–10 min).

## 17/10 05h20–07h — teste com 10 cópias de cards reais no principal (Weslley 05h18: "teste todo o robô… documente e corrija")
- Cópias marcadas como teste (`TST_CARDS`; menções silenciadas), fluxo completo pelo servidor: pedido → cotação → autorização →
  ordem autorizada → compra → recebimento → ENCERRADO (5–10 s por passo; card de 39 peças até 30 s antes do paralelo).
- 🔴 **Gravação pelo servidor DESLIGADA** (`d6e1233`, `ea3af12`): as licenças das travas do robô (checklist `ck_*`, coluna
  `st_ok_*`, descrição `tr_rec_*`) ficavam no cache do servidor e não no do Apps Script — um minuto depois o robô desfazia o
  PAGAS/movimento e comentava "🔒 ALTERAÇÃO NÃO PERMITIDA". Só cards de teste foram atingidos (conferido o quadro desde 16/10 18h).
  Servidor recusa com "nada gravado" e o formulário refaz pelo Google (vale para navegador com config antigo).
  **Correção** (`3bafc2b`): licenças vão ao cache do Apps Script (`vdf_servidorProps {cache}`) antes de responder; travas de
  checklist e coluna só julgam ação com mais de 90 s. Com a gravação desligada, só cards de `TST_CARDS` gravam pelo servidor
  (conferência). **Religar:** variável `GRAVACAO_PRINCIPAL=SIM` no Cloud Run + `GRAVACAO_SERVIDOR: 'todos'` — só com OK do Weslley.
- Outras correções: trava curta na devolução de props e refazer pendentes (`/tarefas/pendentes`); planilha gravada em lote no fim
  da chamada; leitura ao vivo por 30 s após gravação (releitura mostrava o card de antes); MARKUP e BORRACHEIRO são serviço;
  título sem cor/seguradora repetida; pneu sem código vindo como peça comum vira pneu; peça casa pelo código inteiro e mais longo
  ("0000001" pegava a cotação do "00000014"); compra/recebimento gravam itens do checklist em paralelo; eventos não registram card
  de teste; coluna não usa regras de peças quando só há a vitrine (card ia para ENCERRADO "sem peça para a oficina comprar");
  TRAVA com linha duplicada usa a linha da vitrine atual.
- Em aberto (decisão do Weslley): card PARTICULAR precisa da etiqueta ORDEM AUTORIZADA para registrar compra? Dois pneus da mesma
  medida no mesmo card (item + complemento) dividem a mesma chave.
- 17/10 08h35 — Weslley: "1 fazer já / 2 sim / 3 sim / 4 sim". **Gravação pelo servidor religada** para todos (`GRAVACAO_SERVIDOR: 'todos'`;
  interruptor de emergência: `GRAVACAO_PRINCIPAL=NAO` no Cloud Run). Card PARTICULAR continua exigindo ORDEM AUTORIZADA para a
  compra; dois pneus da mesma medida no card continuam sendo a mesma peça; "ÓLEO ADITIVO …" entra na regra de 🚫 não comprar
  padrão (estoque da oficina), como "ADITIVO …".

## 17/10 09h — robô inteiro no servidor (Weslley 08h52: "quero isso terminado essa semana")
- Caminho: **não reescrever** — o servidor roda o MESMO código do Apps Script (bundle com `validarDadosPedido`,
  `verificarAlteracoesDescricao`, `rotinaDiaria`, `relatorioDiario`) num trabalhador `robo` do quadro principal, com as
  propriedades do robô (espelho + devolução), planilha ao vivo, Drive de verdade só leitura (bases Cilia/HDI/SOMA — pasta
  `Rotina Unity/Orçamentos` compartilhada com `compra-peca-run@…`), e-mails pelo Apps Script, travas `sg_*` compartilhadas
  entre robô e formulário.
- `POST /tarefas/minuto` (Cloud Scheduler a cada minuto: ciclo + log de descrição + diárias 07:00/07:15); `GET /tarefas/robo`
  mostra cada execução e, em OBSERVAR, as gravações que ele faria.
- **Chave**: variável `ROBO_SERVIDOR` no workflow do servidor — `OBSERVAR` (só anota) | `ATIVO`. No ATIVO o servidor grava
  `VD_ROBO_SERVIDOR=SIM` no Apps Script e os acionadores do Google só retornam (reserva). Voltar: `OBSERVAR` e publicar.
- Plano: sáb/dom OBSERVAR; seg comparar com o Google o dia todo, virar à noite; ter–qua prazos/diárias/bases; qui formulário
  só servidor; sex Google parado.

## 19/10/2026 — cards abertos pela Rotina com peças a mais
- A Rotina mandou todas as linhas do Cilia (R&I, reparação, pintura, serviço) como peça: BDD2J09 com 35 itens para 2 de troca.
  Limpos com `manter=` (só troca, conferido no PDF): BDD2J09, AXB4A04, ANO6F74, SFL9F03; IWQ5486 com o pneu repetido.
- Correção: `vdf_salvar` com `rotina:true` pega as peças e as FO da base do robô (CILIA-HOJE/HDI-HOJE, `vdf_pecasDaBase_`,
  mesmo filtro `cl_pecasParaOrc_`), mantendo fornecedor/previsão que a Rotina leu no portal. Fora da base: só linhas com `operacao` T.
  Prévia: `GET /tarefas/rotina-base?placa=&sinistro=`. Propriedades do script: 202 KB (alerta de 16/10 era 386 KB, antes da aba ANEXOS).

## 20/10/2026 20h40–21h — check no TESTE com o Fable (Weslley: "check, sugestões, aprimoramento visual, validar a última migração")
- **Ciclo completo no TESTE pelo servidor**, card novo TST2B21 (arquivado depois como "🧪 TESTE — pode excluir"): pedido 6,9 s →
  cotação parcial 3,2 s → cotação 4,4 s (COTAÇÃO FINALIZADA, particular) → autorização 3,9 s → ORDEM AUTORIZADA 1,7 s → compra
  5,0 s (FALTA CHEGAR) → recebimento 3,4 s + 4,1 s (ENCERRADO) → retirada 4,2 s (ENTREGUES). Abrir card 0,35 s. Nenhum erro;
  nenhuma volta ao Google; trava e robô não mexeram no card. Quase todo o tempo de cada gravação é a API do Trello (~0,3 s por
  chamada, em série). Deslize: as menções @comprasunity dos comentários padrão saíram no card de teste (TESTE não silencia).
- **Visual 2.0** (capturas no computador e em 375 px): computador ok; no celular o cabeçalho ocupa ~190 px (placa + caixa
  "Sem foto" vazia + botões em duas linhas) e as 6 abas viram 3 linhas — sugestões anotadas no relatório (não aplicadas).
- **Última migração (Google parado)** — o que o servidor ainda pede ao Apps Script: propriedades do robô (espelho + devolução a
  cada gravação e a cada minuto do robô), licenças das travas (esperadas antes de responder), e-mails (MailApp), OCR do Google
  (vdf_ocrServidor), volta do formulário ao Google quando o servidor falha, e os acionadores (só retornam). O TESTE já roda
  100% no banco (gas_propriedade, cache em memória) — é a prova de que o caminho funciona. Plano no relatório ao Weslley.
- 22h30 — **Visual do celular (só TESTE, `PU_CFG.VISUAL_CEL: 'teste'`)**: correção da revisão de 20h40 — as capturas "de celular"
  eram o layout de computador espremido (o modo vem do aparelho, não da largura); chave `&aparelho=celular|pc` para conferir no
  computador. No layout de celular de verdade: topo com "Sem foto" virando ícone (a etapa não corta mais), previsão como selo
  "Previsão 22/09 · atrasada" no recebimento + botão "✔ Chegou tudo" (≥ 3 peças, só marca as caixas), botão principal do rodapé
  em 2 linhas em vez de "Enviar com…", barra do WhatsApp sem subtítulo. Conferido nas 4 telas em 375 px. Principal: `'todos'`.
- Weslley: e-mail fica de lado; quer "liga um, desliga outro" — plano de ~18 h em duas noites (chaves por fonte: propriedades,
  planilha, OCR, bases; cópia de volta ao Google por 30 dias).
- 22h50–23h40 — **Pacote de entrega para o unityOS** (Weslley: o desenvolvedor usa o Claude Code; módulo em ~1 semana depois do
  comando → migração do Apps Script descartada): `docs/HANDOFF-UNITYOS.md` (mapa: levar × refazer × descartar, código, regras
  que enganam, dicionário de dados, integrações, pendências), `CLAUDE.md` na raiz (regras fixas e como trabalhar), especificação
  revisada (20/10, §13 mudanças desde 16/10), rota `POST /tarefas/exportar` (NDJSON por tabela; só diretoria pelo login do Trello;
  corpo JSON; CORS; sem token não cai no token do robô). Conferido no TESTE: pedido_retrato 158, trello_card 226, evento 4.180,
  anexo_leitura 487 linhas. Regra daqui em diante: toda mudança de regra atualiza especificação + handoff no mesmo commit.
- 23h20 — `VISUAL_CEL: 'todos'` (OK do Weslley): ajustes visuais do celular no principal. Conferido antes no TESTE (celular: topo,
  selo de previsão, "Chegou tudo" marca/desmarca sem gravar; computador intocado).
  Conferido no principal (ATP5105, AGL5650, só leitura): com foto de capa a etapa quebrava ("Recebiment/o") — miniatura 56 px e
  etapa 13,5 px; "Recebimento", "Editar pedido" e "Cotação" numa linha. Computador intocado.

## 21/10/2026 — monitoramento: falso alarme do webhook e conector do Trello fora
- 09:58 "webhook parado em 20:50": era o webhook do TESTE (sem atividade à noite); o do principal estava vivo
  (/tarefas/robo/rapido). Webhook do TESTE testado (comentário no card 🧪 arquivado) — chegou em segundos. Texto da tarefa ajustado.
- 10:58–12:58: conector do Trello (MCP da Anthropic) com timeout/502 por 3 h — não é da conta do Weslley nem do quadro. Reserva no
  servidor: `GET /tarefas/robo/atividade?horas=` — ações do principal recebidas pelo webhook, só tipo/quem/card(shortLink)/colunas/
  marcador do comentário (sem nome de card nem texto); memória de 24 h. Tarefa: tenta o conector de novo em 60 s, senão usa a reserva;
  conector fora não é 🔴 nem notificação.
- 13h56 — SES8I10 CRETA PARTICULAR (Lucas, Cascavel): "não lê o orçamento e travou". O PDF é orçamento **particular do Cilia da
  própria oficina** (sem "CASCO - marca", sem chassi, cor "-"): a peça (porta) FOI importada, mas modelo/ano não (cabeçalho
  "CRETA (2020 A 2025) ACTION AUT 1.6 16V FLEX 2024") e pedido particular exige modelo, ano e chassi → "Faltam 3 dados". Dois
  defeitos de tela: botão "⏳ Importando…" preso (lista não redesenhada quando nada mudou) e dica "não achei dados novos" com a
  peça importada. Corrigido: leitor reconhece o cabeçalho (modelo + ano; leitor v3 relê Cilia no formulário), botão solta quando a
  leitura termina, dica diz o que o documento não traz. O chassi continua tendo de ser digitado (o documento não tem).
- 16h40 — SES8I10 "salvei tudo e voltou de novo": corrida. O Weslley salvou (16:37:47) e, no mesmo segundo, o robô — que tinha lido o
  card antes e estava lendo os anexos (leitor v3 releu o PDF e achou modelo/ano/motor) — gravou a descrição VELHA + campos lidos por
  cima, apagando chassi e tipo; FALTA DADOS de novo (16:38:05). Segundo salvamento (16:39) ficou. Correção no robô (`vd_descMudou_`):
  antes de gravar depois de ler anexos, confere se a descrição mudou; se mudou, deixa para o próximo ciclo. De quebra: em pedido
  PARTICULAR saía "🔀 QUEM PAGA MUDOU — voltou para a seguradora" (com @menções) a cada edição — o formulário manda particular=false e
  a análise marca todas como particular; agora não compara.
- 16h52 — Weslley: "aviso de COTAÇÃO PARCIAL toda vez é excessivo" (card com 3 parciais seguidas). Agora só comenta quando a situação
  muda (assinatura `VDF_PARC_<card>`: o que falta / tudo coberto / movido); zera no envio da cotação. Direto no principal (pedido dele).
- 16h57 — Weslley: reenviar a autorização com uma alteração repetia "✅ AUTORIZADO" inteiro (BBW5…: 17 peças, só a obs mudou).
  Agora reenvio compara com a autorização anterior: "✏️ AUTORIZAÇÃO ALTERADA" só com o que mudou (trocou / autorizou agora /
  obs / marcas) e o total do card; igual = "🔁 reenviada sem alteração". Marca `VDF_AUT_ENV_<card>` no envio; cai na devolução.
- 17h22 — Weslley: "aviso nenhum de cotação parcial, tá tumultuando" → cotação parcial deixa de comentar no card (desfaz a regra
  das 16h52); só o "Enviar cotação" avisa.
- 17h24 — Weslley: "quando o consultor definir a peça e ela for marcada como não comprar, informar @fulano marcou os itens x, y".
  vdf_salvar compara as 🚫 de antes com as de agora e comenta "🚫 NÃO COMPRAR — @consultor marcou como não comprar: …".
- 17h27 — Weslley: "só avisar se o prazo para a tarefa, seja qual for, expirar" (print: "@timweslley 💰 COTAÇÃO → PENDENTE
  AUTORIZAR"). Comentários de fluxo do formulário sem @menção (`vdf_mencao_`, chave MENCAO_FLUXO=NAO); os lembretes ⏰ do SLA
  continuam mencionando. Mantidas as menções de FALTA DADOS/PEÇA NOVA, travas, faturamento, ORDEM AUTORIZADA PENDENTE e compra
  fora da autorização (não têm prazo no SLA — ver com ele se também devem calar).
- 17h49 — Weslley (AGL5650): "não tem quem incluiu e pediu as 2 novas peças" e "no formulário não tem a unidade — importante
  para o autorizador". Edição do pedido comenta "✏️ PEDIDO EDITADO — Nome (usuário)" com incluiu / tipo definido / tirou / não
  comprar (substitui o "🚫 NÃO COMPRAR" das 17h24 na edição). Painel 2.0: Unidade e "Pedido por".
- 18h46 — Weslley: e-mails de falha do GitHub ("Publicar Apps Script") e pedido de revisar TODOS os comentários do robô/formulário
  (quando e formato, sem notificar a cada movimento). Falha: o projeto Apps Script bateu em **200 versões** (`clasp deploy` falha
  desde 20/10 20h57; `clasp push` continua, o servidor é quem roda) — precisa apagar versões antigas em "Histórico do projeto"
  (conta sistema@) e depois tornar o deploy do Apps Script manual/semanal. Inventário e proposta: `docs/COMENTARIOS-ROBO.md`.
- 19h03 — Decisões do Weslley sobre os comentários (ver `docs/COMENTARIOS-ROBO.md`, todas aplicadas): sem comentário de pedido
  novo e sem "DADOS COMPLETOS"; FALTA DADOS mantido; reenvio igual, parciais (autorização/compra) e "negociação anexada" calados;
  rotina antiga de PARADO só etiqueta; ⏰ de item atrasado um por card/dia; SLA novo para FALTA DADOS (1 d.u.) e AUTORIZADO
  COMPRA (2 d.u.).
- 19h14 — Weslley: "Devolver para cotação" abre balão com campo de motivo (obrigatório; opcional se há obs. em alguma peça), em
  vez de exigir a observação geral. Computador e celular (camada 2.0).
- 19h32 — Weslley: "lembrar sempre que essas alterações devem bater com as diretrizes de design que já estabelecemos". Diretrizes
  consolidadas numa seção do `CLAUDE.md` (público, duas interfaces por aparelho, estrutura das telas, balões, resultado em cartão,
  só aparência na 2.0, conferir no TESTE nos dois aparelhos antes de publicar). Memória também anotada.
- 19h51 — Rotina Unity travada em 2 placas (FPY5D56, QCJ1I71): placa na base do robô → pneu da base sem categoria e a API recusava
  "falta categoria" ignorando a 1ª LINHA que a Rotina mandou. Agora aproveita categoria/marca do pneu da mesma medida e, se ainda
  faltar, abre o card em FALTA DADOS em vez de recusar. TAW0B79: "KIT COLA BRR01" é insumo → 🚫 não comprar padrão (cola, adesivo,
  silicone, vedante).
- 20h06 — Conferência pós-mudanças: servidor 68592fc ATIVO, robô ciclando, 0 erros em 3 h, workflows verdes. Card da Rotina vUhlsOpU
  trouxe "INSUMOS GRAMPOS, CINTAS PLASTICAS, BUCHA" como peça → "INSUMO(S)" entra na regra de insumo (🚫 padrão).
- 20h16 — Devoluções ao fornecedor (decisões: comprador informa a NF; 3 d.u.; segura o card; só NF; FO também; sem coluna nova).
  Feito e testado no TESTE (TAJ0E65 ToNGgZ6P: 2 devoluções → checklist DEVOLUÇÕES → NF pela tela e pela API com anexo PDF →
  itens ✔, anexo renomeado, comentários). Principal espera o OK (`RC_DEV_PRINCIPAL=SIM`).
- 21h33 — Weslley: "dá pra ligar né?" → devoluções ligadas no principal (padrão SIM; `RC_DEV_PRINCIPAL=NAO` desliga).
- 21h39 — Weslley: incluir as devoluções dos cards ainda não entregues. Varredura dos 272 cards abertos fora de ENTREGUES
  (descrição, checklists e 100 comentários por card): 2 devoluções a fornecedor sem NF registrada — RHM1J09 (moldura, FIAT FIPAL,
  09/10, troca) e AAZ0E84 (calha de chuva, Mercado Livre, 13/10) — incluídas via `vdf_incluirDevolucao` (diretoria). Fora:
  ATP5105 (ventoinha voltou ao estoque WEV, interno), FOB8723/JDC7H45 (movimentos internos de estoque), 2 cards antigos de
  fev/set em PENDÊNCIA (fluxo antigo).

## 22/10/2026 — código ou foto na peça particular (Weslley: "obrigar nos orçamentos particulares que o consultor preencha o código ou anexe uma foto da peça")
- Decisões dele: vale para particular, peça 👤 em card de seguradora e retorno; botão 📷 em cada peça; só peça nova ou alterada. No TESTE (`FOTO_PECA: 'teste'`); principal só com OK (`FOTO_PECA: 'todos'` + `VD_FOTO_PECA=SIM`).
- 21h40 — AYT6699: ler o orçamento já processado não atualizava o código da peça lançada à mão (sem código) nem a faixa amarelo → verde; corrigido (`casadas`/`atualizar` no `vdf_compararComplemento` + bloco 2.0). Pedido direto do Weslley no card do principal.
- 22h10 — AYT6699: 1º envio levou a EM COTAÇÃO e o ciclo devolveu a FALTA DADOS 3 s depois com a descrição velha (precisou enviar 2x); `vd_completaAtrasada_` segura a devolução até a cópia oficial bater.
- 22h30 — Weslley: ciclos de 1 min ainda são necessários com o aviso do Trello? → "altera e monitora" (direto no principal). Varredura a cada 10 min + seguimento 100 s depois de cada aviso; monitoramento provisório agendado (contadores em /tarefas/robo/rapido, consumo de chamadas, MOVIMENTO DESFEITO indevido).

## 23/10/2026 — orçamento só de mão de obra (Weslley: "orçamentos só de mão de obra também devem ter card aberto e o robô deve encaminhá-los para ENCERRADO automaticamente")
- `vdf_salvar` aceita `soMaoDeObra:true` (Rotina + diretoria + card novo): card sem peça direto em ENCERRADO, vitrine "🔧 SÓ MÃO DE OBRA", recusa se a base da placa tem peça. Casos que motivaram: DTA9330 (Toledo), GHH1I54 e FYS4A72 (Cascavel). TESTE sempre; principal só com OK (`VD_SO_MO=SIM`). Preparado como patch (sem push).
- 10h40 — Patch da Rotina (sessão Opus) revisado e aplicado por esta sessão: lógica ok (chave por quadro, linha "nenhuma peça…"
  compatível com vd_linhasPecas_/vd_linhasConsultor_, base VD_PK2_ na criação, ENCERRADO → ENTREGUES pela rotina de 15 dias).
  Ligado no principal (padrão SIM) porque o pedido do Weslley de 23/10 é para os cards reais (DTA9330, GHH1I54, FYS4A72).
- 10h44 — Weslley (pedido do comprador): anexar arquivo/foto da cotação para registro. Seção "Arquivos da cotação" na aba
  Cotação (2.0, computador e celular), sobe junto com parcial/envio, anexo `💬 COTAÇÃO · PLACA · FORN · dd/MM`.
  Teste no TESTE (ZZT9C01): arquivo subiu pela tela e foi anexado; achado e corrigido: salvar parcial SÓ com arquivo movia o
  card para EM COTAÇÃO (regra da parcial) — agora só anexa, sem mexer em coluna/etiqueta. O rotulador 2.0 dos botões de anexo
  apagava o input das seções novas (Devoluções e Arquivos da cotação) — corrigido (`data-v2c`).
- 11h13 — Weslley: "onde está o botão por cotação e por peça?" e "depois de anexado, ver o anexo" → 📎 no cabeçalho da peça, em
  cada cotação salva (tabela) e em cada cotação em edição; links "📎 ver" do que já está no card; nome do anexo com fornecedor e
  peça. Testado no TESTE (ZZT9C01): `💬 COTAÇÃO · ZZT9C01 · AUTOX · GRADE DO PARACHOQUE 🧪 · 23/10`.
- 15h56 — TBP3J46 (Allianz, Cilia): modelo e ano não lidos — marca-d'água "NÃO AUTORIZADO" com letras soltas depois do ano
  quebrava a regra CASCO. Corrigido (+ teste); leitor v4. Obs.: o orçamento está "NÃO AUTORIZADO" no Cilia (marca-d'água).
- 15h57 — Weslley: "salvar parcial não foi — ele deve exigir nada, é só pra salvar e depois terminar" (TBP3J46 barrava por
  falta de unidade). Parcial agora só exige placa em card novo (servidor + tela).
- 16h06 — Weslley: "alertar quando abre um card de carro que já existe (ativos)?" — o formulário já avisa (placa e envio); o
  robô passa a avisar uma vez em card criado à mão com placa de outro card aberto (`vd_avisoDuplicado_`, VD_DUP_).
- 16h12 — TBP3J46 "continua não lendo": o formulário lê pelo servidor com o texto do OCR do Google, onde a marca-d'água sai
  inteira ("2025 Não Autorizado Placa") — a regra só cobria o pdftotext. Lookahead ganha "NAO "; leitor v5 nos dois lados
  (VD_LEITOR_V e VERSAO_LEITOR do servidor, para o cache reler).
- 17h53 — Weslley (MVU1552 F250): compra cancelada, comprador lançou cotação nova e virou "registro". Agora o Enviar cotação
  pergunta por peça (registro × nova autorização); "nova" cancela a autorizada (INDISPONÍVEL) e devolve o card ao autorizador.
- 23/10 19h — FUR0C92 (print HDI): cabeçalhos viravam peça, 2 molduras numa linha, fornecedores fora de ordem e código 62022W730P partido; leitor HDI corrigido (amostras antigas iguais).
- 23/10 19h30 — SFL9F03: "QTD 1" lido como fornecedor no Status das Peças do Cilia; leitor e gravação corrigidos, itens LANTERNA e CALOTA limpos.
- 26/10 10h45 — APO0I47: orçamento Cilia com chassi de 16 caracteres; robô e formulário passam a avisar (não preenchem).
- 26/10 11h — Weslley: comprador corrige o código da peça na Cotação (código da concessionária) e põe obs. em cada cotação; ligado no principal (`COT_CODIGO_OBS: 'todos'`, OK 11h09).
- 26/10 11h10 — MVU1552: cotação nova após compra cancelada foi salva como registro (Salvar parcial não perguntava); pergunta registro × nova autorização agora também no parcial, pré-marcada "nova" em peça com compra cancelada.
- 26/10 11h40 — AYT6699: criado PARTICULAR pelo consultor (08/10); título trocado para ALLIANZ em 19/10 sem mudar o tipo do pedido; a edição de 22/10 voltou PARTICULAR. Weslley mudou para seguradora e o card ficou em COTAÇÃO FINALIZADA → regra FINALIZADA ↔ PENDENTE pelo quem paga. PYU9B65: diretoria converte card de seguradora sem peça da seguradora em particular.
- 26/10 14h20 — BET7D44: "ver cotações" da peça já comprada (aba Cotação) não abria — a regra que esconde vencia a que mostra (CSS); corrigido. Nenhuma cotação perdida (26 no card).
- 26/10 15h20 — Weslley: comentários do formulário com "@quem fez + o que fez" (prazo com "pelo motivo"); coluna Registro na EVENTOS.
- 26/10 21h — Painel "Desempenho Compra de Peça" (artefato) com tempo por etapa e por pessoa; coletor em tools/desempenho/coletar-navegador.js (só leitura, roda no navegador) e tarefa agendada semanal (1º dia útil da semana) que atualiza o painel.
- 26/10 21h15 — TCL9H02: pedido particular montado do orçamento Cilia #000092 cruzado com a lista do Vilson (11 pedir, 17 não comprar). Correção: Salvar parcial da cotação com o card em FALTA DADOS não tira mais o card de FALTA DADOS.

## 26/10/2026 — velocidade do salvamento (Weslley: "a demora no salvamento pode ser corrigida? ou melhorada?")
- 22h16 — Medição nos envios do próprio Weslley (vd_tempos): Enviar pedido 10–16 s, cotação 4–10 s. Conta por dentro: Trello
  3–8 s (chamadas em sequência), licença das travas 2,3 s, planilha do Google 1,5–2,5 s. Weslley: "não é seguro fazer direto
  no principal?" — é (esse caminho só existe no principal).
- 22h35 — Passo 1 no servidor (`ponte.ts`): licença das travas e gravação da planilha depois de responder à tela; abas
  pré-lidas em paralelo. Detalhe em `docs/PROJETO-SERVIDOR.md` (diário 26/10). Acompanhar em `/tarefas/execucoes`.
- 22h50 — Passo 2: `vdf_salvar` lê o card UMA vez (com checklists e anexos) e reaproveita nas conferências de peça travada,
  FORNECIMENTO no checklist, orçamento anexado, anexo repetido e link 💰 (eram até 5 leituras a mais, ~0,25 s cada); o
  servidor passa a guardar a trilha das chamadas de rede de cada execução (`trilha` em `/tarefas/execucoes`) para achar
  repetições. Conferir no TESTE (ZZT9C01) assim que publicar; o Weslley autorizou fazer direto no principal.
- 23h05 — Publicado (`10fc6ad`, `71f1447`, Weslley: "pode publicar"; rebase sobre 11 commits da outra sessão de hoje). Passo 2b:
  nº da ordem e unidade iguais não são regravados (eram 2 PUT + cf_sincronizar_ a cada edição). Trilha agora diz a função
  do robô por trás de cada chamada. Enviar pedido no TESTE (ZZT9C01, sem alteração): 16 → 12 chamadas ao Trello, 3,75 → 3,2 s
  (no principal o ganho é maior: lá saem ainda a licença e a planilha do Google de antes da resposta). O que resta
  (vd_gravarDesc_, rc_reavaliarColuna_, vd_marcar_/cf_sincronizar_ relendo o card) fica para outra rodada.

## 27/10/2026 — conferência do salvamento mais rápido (Weslley: "Conferir se tudo está ok")
- 09h22 — Servidor `71f1447` ATIVO, banco e webhook ok. 1º envio real depois da mudança (Recebimento, 09h14): 8,3 s na tela;
  licença (3,0 s) e planilha (1,45 s) rodaram depois da resposta — ontem seria ~12,8 s. Trilha: o mesmo card lido 6× na
  mesma chamada sem gravação no meio (ev_unidade_ ×3 customFieldItems, vd_marcar_/cf_sincronizar_). Servidor ganha memória
  de GET repetido dentro da chamada (esvaziada em qualquer POST/PUT/DELETE ao Trello) — `memo.get` em ops. Máscara da
  trilha corrigida (shortLink sem dígito aparecia).
- 09h40 — BBI3942 (Jeziel, card novo pelo formulário 09h03): o robô comentou "PLACA JÁ TEM CARD ABERTO" 19 s depois da
  criação, embora o formulário já tenha feito a pergunta — o ciclo rápido do webhook leu as propriedades antes de a marca
  VD_DUP_ sair da gravação (corrida de sempre, 1º caso real da regra de 23/10). Correção: card com o marcador do formulário
  na descrição não ganha o aviso. `/tarefas/exportar` ganha a tabela `execucao` (só tempos, sem card) para a diretoria.
- 09h55 — Achado o grosso dos 30 s do BBI3942 (reproduzido no TESTE com 3 fotos: 36,8 s): depois de criar o card o formulário
  roda a conferência do robô, que baixa e passa OCR em cada foto recém-subida (~7 s por foto) procurando dados do carro — com a
  pessoa esperando. Agora foto/capa/outro anexo que acabou de subir fica fora do OCR dessa conferência (o orçamento já foi lido
  antes; o robô lê o resto no ciclo seguinte se o card precisar). `/tarefas/execucoes` ganha a lista `formulario`.
