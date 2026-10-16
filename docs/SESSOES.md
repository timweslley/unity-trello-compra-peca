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
