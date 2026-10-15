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
