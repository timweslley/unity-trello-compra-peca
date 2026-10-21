# Entrega do módulo "Compra de Peça" para o unityOS

**Para quem:** o desenvolvedor do unityOS e o Claude Code dele. **Dono:** Weslley Santos (Grupo Unity).
**Última revisão:** 20/10/2026 · este arquivo é atualizado a cada mudança de regra, junto com `ESPECIFICACAO-SISTEMA.md`.

Leia nesta ordem: 1) este arquivo (o mapa); 2) `ESPECIFICACAO-SISTEMA.md` (as regras, 650 linhas); 3) `SESSOES.md` e
`PROJETO-SERVIDOR.md` só quando precisar do porquê de uma decisão; 4) o código, pelos ponteiros abaixo.

## 1. O que o sistema faz (em uma tela)

Controla a compra de peças das oficinas (Toledo, Marechal Cândido Rondon, Cascavel, Campo Mourão) para carros de
seguradora, particulares e retornos (garantia/retrabalho, oficina paga):

```
pedido (consultor) → cotação (compras) → autorização (diretoria; consultor nas peças particulares)
→ compra (compras) → recebimento (compras / consultor nas filiais) → retirada → faturamento (financeiro)
```

Hoje a **tela da equipe é o Trello** (um card por carro, colunas = etapas) e as ações passam por um **formulário web**
("Power-Up" dentro do card e link no celular). Um **robô** valida, importa orçamentos, trava o que não pode ser mexido à
mão, cobra prazos e registra tudo. A fonte de verdade de cada pedido é a **descrição completa do card** (texto
estruturado) mais os **checklists** PAGAS/FORNECIMENTO — o banco do servidor espelha isso.

## 2. O que levar como está, o que refazer, o que jogar fora

| Parte | Onde está | Decisão | Por quê |
|---|---|---|---|
| **Regras do fluxo** (validação, cotação parcial, autorização mista, complementos, não comprar, compra fora da autorização, recebimento, retirada, devolução, faturamento) | `apps-script/*.gs` (robô + `FormularioServidor.gs`), espelhado em `servidor/recursos/formulario.gs.js` | **Portar** — é regra de negócio decidida pelo Weslley, item a item (ver §2.2–2.5 da especificação) | ~330 funções; cada regra tem data e motivo no comentário do código |
| **Leitores de documentos** (orçamento Cilia / HDI / Websoma-Porto, Status do Pedido do Cilia, relatório de peças, print HDI, NF) | `servidor/src/leitores/robo.js` (JS puro, 50 funções, gerado de `apps-script/`), `texto.ts`, `ocr.ts` | **Usar como está** (biblioteca) | 519 textos de treino (lotes JSON na pasta do Drive "Treino do leitor de orçamento", conta do robô; `Treino.gs` coleta) + testes em `servidor/test/leitores.test.ts`; refazer custa semanas |
| **Dias úteis e feriados** (nacionais, estaduais, municipais das 4 cidades, Carnaval) | `apps-script/Validacao.gs` (`du_*`) | Usar como está | regra fixa do Weslley |
| **Cadastro de fornecedores** (nomes, apelidos, aprende com a cotação; tipos CSS/lataria/mecânica/pneu) | aba FORNECEDORES → `gas_linha`; `Fornecedores.gs` | Portar os dados; a lógica é pequena | |
| **Formulário 2.0** (telas de pedido, cotação, autorizar, compra, recebimento, retirada, fornecimento; celular e computador) | `apps-script/Formulario.html` (fonte) → `powerup/formulario.html` (gerado) | **Refazer na tela do unityOS** usando as telas como referência (capturas em `docs/VERSAO-2.0.md` e no Drive) | é HTML/JS em cima do Trello; vale a organização, os textos e os avisos, não o código |
| **Trello** (quadro, Power-Up, Butler, webhooks, espelho) | `powerup/`, `servidor/src/trello/`, `Fluxo.gs`, `TravaChecklist.gs`, `Seguranca.gs`, `Espelho.gs` | **Jogar fora** quando o unityOS tiver a própria tela de fluxo | as travas existem só porque o Trello deixa qualquer um mexer |
| **Apps Script / Google (planilha, propriedades, Drive, OCR do Docs)** | `apps-script/`, `servidor/src/gas/` (imitação dos serviços do Google) | **Jogar fora** | infraestrutura temporária |
| **Rotina Unity e consulta diária do Cilia** (fora deste repositório: Claude no PC do Weslley + API do Cilia) | `cilia/`, `portais/` | Integrar: o unityOS passa a receber a base do Cilia direto (hoje é arquivo no Drive) | ver §6 |
| **Notas fiscais × card** (Qive, Mercado Livre, régua nota→card) | skills da rotina (fora do repositório) | Fase seguinte | hoje é feito pelo Claude, não pelo robô |

## 3. Mapa do código

```
apps-script/            robô + back-end do formulário (Google Apps Script; roda TAMBÉM no servidor, sem alteração)
  Validacao.gs            validação do pedido, importação de orçamento, travas de descrição, prazos, dias úteis (du_*), relatório
  FormularioServidor.gs   API do formulário: vdf_* (carregar card, salvar pedido, cotação, autorizar, compra, recebimento, retirada…)
  Fluxo.gs                trava de colunas (quem pode mover o quê) e SLA por etapa
  TravaChecklist.gs       trava dos checklists PAGAS/FORNECIMENTO
  Complemento.gs          orçamento complementar (peças fora do autorizado)
  Previsao.gs             fornecimento (FO): leitura do Status do Pedido / HDI / relatório de peças, previsão, pareceres
  Recebimento.gs          recebimento, local no estoque, retirada, devolução, cancelamento de compra, renomear/encerrar (diretoria)
  Faturamento.gs          ENTREGUES → faturado → arquivado; só o Weslley desarquiva
  Anexos.gs               nomes padronizados dos anexos (📄 ORÇ · PLACA · SEG · origem · dd/mm, 📸, 🚚 FO, 🛒 COMPRA, 📦 NF)
  Fornecedores.gs · Eventos.gs · Campos.gs · Cota.gs · Saude.gs · Painel.gs · CiliaApi.gs · Migracao.gs · Treino.gs · Teste.gs
  Formulario.html         o formulário inteiro (clássico + camada 2.0); gera powerup/formulario.html
servidor/               Node/TypeScript + Postgres (Cloud Run + Neon) — o que vai ficar de verdade
  src/index.ts            rotas: /api (protocolo do formulário), /trello/webhook, /saude, /tarefas/* (robô, exportação, diagnóstico)
  src/gas/ponte.ts        roda o código do Apps Script num trabalhador com os serviços do Google imitados (temporário)
  src/leitores/           leitores de documentos (robo.js, texto.ts, ocr.ts, anexos.ts, leitura.ts)  ← levar
  src/trello/             espelho do quadro no banco, webhook, API
  migrations/*.sql        esquema do banco (ver §5)
  test/                   vitest: leitores, espelho, planilha, webhook, gas
powerup/                Power-Up do Trello e formulário estático (GitHub Pages) — temporário
docs/                   ESPECIFICACAO-SISTEMA.md (regras) · VERSAO-2.0.md (telas) · PROJETO-SERVIDOR.md · SESSOES.md (diário)
cilia/                  consulta diária pela API do Cilia (roda no PC do Weslley: `cilia/pc`) · portais/ notas dos portais (HDI, SOMA, Qive, ML)
tools/                  gerar_formulario_estatico.py e utilitários
```

**Como rodar:** `cd servidor && npm ci && npx tsc -p . && npm test` (28–30 testes; os de banco precisam de `DATABASE_URL`
Postgres). Publicação: push na `main` → GitHub Actions (`Servidor` → Cloud Run; `Publicar Apps Script`; Pages).

## 4. As regras que mais enganam (leia antes de portar)

- **Chave da peça** = código (sem espaços) ou, sem código, a descrição; pneu = medida + marca/categoria. Dois pneus da mesma medida no mesmo card são a mesma peça (decisão 17/10).
- **Peça nova** num card que já passou da cotação volta o card para EM COTAÇÃO — mas mudar OBS, marca de complemento (`COMPL:`), tipo ou observação da peça **não** é peça nova (assinatura `vd_sigFormas_`).
- **Cotação parcial** segura o card; peça não cotada com justificativa conta como resolvida; comprador pode cotar **tipo diferente do pedido** (aviso "fora do pedido" para quem autoriza).
- **Autorização**: diretoria (`VD_AUTORIZADORES`: timweslley, comercialunity, christianfarias23) nas peças da seguradora; o consultor que lançou, nas particulares; card misto só anda quando as duas partes estão autorizadas. "Não autorizar esta peça" ≠ "🚫 Não comprar" (este tem motivo e tira a peça da compra). Card em que tudo é "não comprar" (ou só FO) vai para ENCERRADO/FALTA CHEGAR sozinho.
- **Compra** só com a etiqueta ORDEM AUTORIZADA (Databox); compra fora da autorização só avisa; prazo diferente do cotado exige motivo. Item do PAGAS: `CÓDIGO DESCRIÇÃO - FORNECEDOR - R$ valor` (+ ` · 📍 local`, ` · ✋ quem dd/mm`, ` · ↩️ devolvida`).
- **Devolução ao fornecedor** (21/10): peça devolvida (oficina ou FO) gera uma pendência própria — data da devolução, nº da NF de devolução, anexo — fechada pelo comprador; pendência aberta segura o card antes de ENTREGUES; prazo 3 d.u. No unityOS: entidade `devolucao` (peça, fornecedor, valor, data, motivo, nf, anexo, quem fechou).
- **Recebimento**: Toledo só compras/diretoria; filiais também o consultor. Tudo recebido → ENCERRADO; tudo retirado → ENTREGUES; faturado (comentário do financeiro/Cris) → arquivado; **só o Weslley desarquiva**.
- **Prazos**: 1 dia útil completar dados (FALTA DADOS), 2 dias úteis cotar, 2 autorizar, 2 comprar (AUTORIZADO COMPRA), 1 de folga após a previsão; avisos de item atrasado: um por card por dia; lembretes só 8h–18h em dia útil; faturamento cobrado após 7 dias úteis em ENTREGUES (só cards entrados a partir de 20/10/2026 15:30 recebem lembrete no card; os antigos vão no resumo diário).
- **Zacarias** (concessionária): peças sempre FO, nunca compra. **SEM COBERTURA** no orçamento não entra. **ADITIVO/ÓLEO** e **COLA/ADESIVO/SILICONE/VEDANTE** são "não comprar" padrão (estoque/insumo).
- **Retorno** (oficina paga): nasce copiando o carro de um card da mesma placa (inclusive arquivado); puxa a capa; OBS "RETORNO INTERNO — card anterior …".
- **Concorrência**: formulário e robô gravam a mesma descrição. Quem grava depois de uma leitura demorada (anexos) tem de conferir se a descrição mudou e, se mudou, desistir e refazer (21/10, SES8I10). No unityOS: transação/versão do pedido, não "último escreve ganha".
- **Comentários de rotina só quando algo muda** (21/10): o robô/formulário guarda a assinatura do último aviso por card (ex.: `VD_SIG_`, `VDF_PARC_`) e não repete o mesmo estado — cotação parcial, falta dados. Portar como "estado avisado" do pedido.
- **Notificar só no prazo** (21/10): o andamento do fluxo (cotou, autorizou, devolveu…) não notifica ninguém; a pessoa é chamada quando o prazo da tarefa dela vence (SLA). No unityOS: notificação = vencimento, não evento.
- **Comentários**: nunca "seguir com compra/fornecimento" nem "cotar/comprar"; peça de oficina = "verificar compra do item X"; FO = "verificar prazo do item X"; nunca a palavra "faturado" fora do fluxo do financeiro; dúvida sempre com PLACA + nº da O.S.

## 5. Dados — dicionário e exportação

Esquema em `servidor/migrations/` (uma migração por fase; nomes em português). O que interessa ao unityOS:

| Tabela | O que é | Levar? |
|---|---|---|
| `trello_card` | retrato atual de cada card (nome, lista, descrição, etiquetas, campos, checklists, anexos, `desc_completa`) | sim — é o pedido |
| `pedido_retrato` / `pedido_historico` / `v_peca` | o pedido já **estruturado** (dados do carro, peças, cotações, autorizadas, pagas, recebíveis, totais) e cada mudança de etapa com hora | **sim — comece por aqui** |
| `evento` | log de negócio (PEDIDO, COTAÇÃO, AUTORIZAÇÃO, COMPRA, RECEBIMENTO, RETIRADA, DEVOLUÇÃO, COLUNA, CONVERSÃO…) com peça, fornecedor, valor, previsão | sim |
| `trello_acao` | toda ação do Trello (comentários, movimentos) crua | histórico; opcional |
| `planilha_trava` | descrição oficial completa por card (fonte de verdade das peças, formato em §4.2 da especificação) | sim (ou derive de `pedido_retrato`) |
| `anexo_leitura` | leitura de cada anexo (placa, chassi, orçamento, peças oficina/FO, documento de fornecimento) | sim — evita reler PDFs |
| `gas_linha` (abas FORNECEDORES, EVENTOS, CHECKLISTS, BACKUP, ANEXOS) | a planilha do robô, linha a linha | FORNECEDORES sim; o resto é histórico |
| `gas_propriedade` | estado interno do robô (bases de peça por card, marcas, parâmetros `VD_*`, `SLA_*`, `FAT_*`) — §4.8 e §10 da especificação | só os parâmetros |
| `config`, `usuario` | parâmetros e pessoas (papéis: consultor, comprador, diretoria, financeiro, admin; unidade) | sim |
| `trello_quadro`, `sincronizacao`, `execucao`, `guardado`, `ocr_texto`, `gas_arquivo` | infraestrutura do servidor | não |

**Exportar:** `POST https://compra-peca-858550421734.southamerica-east1.run.app/tarefas/exportar` com corpo JSON
`{"token": "<token do Trello de alguém da diretoria>", "tabela": "pedido_retrato", "quadro": "oH4TbTqb", "desde": "2026-09-01"}`
→ NDJSON (uma linha por registro). Tabelas: `trello_quadro, trello_card, trello_acao, evento, planilha_trava, anexo_leitura,
pedido_retrato, pedido_historico, gas_aba, gas_linha, gas_propriedade, config`. `quadro` aceita o shortLink
(`oH4TbTqb` principal, `ZX4gRmnX` TESTE). Sem login da diretoria devolve 403. Os dados são do grupo: ficam no Drive do
Weslley ou vão direto para o banco do unityOS — **nunca neste repositório (público)**.

## 6. Integrações (o que o unityOS vai conversar)

| Sistema | Como | Credencial | Onde está o código |
|---|---|---|---|
| Trello | REST `api.trello.com/1` (chave + token da conta do robô "Tim"; webhooks por quadro) | Secret Manager do projeto `unity-compra-peca` | `servidor/src/trello/`, `vd_api_` em `Validacao.gs` |
| Cilia (orçamentos, Status do Pedido, relatório de peças) | API oficial, um token por casa (4); consulta diária no PC do Weslley grava a base (hoje no Drive) | com o Weslley | `cilia/`, `CiliaApi.gs`, leitores |
| HDI Prestador | portal (print/PDF lido pelo leitor) + web service via Cilia para importar no Databox | — | `portais/`, `Previsao.gs` (`pv_lerHdiPecas_`) |
| SOMA / Websoma (Porto, Azul, Itaú, Mitsui) | portal (PDF do orçamento) | — | `Orcamento.gs` (`vd_websomaDetalhado_`) |
| Databox (ERP da oficina) | só leitura/conferência humana (etiqueta ORDEM AUTORIZADA = conferido no Databox) | — | — |
| Qive (NF-e) e Mercado Livre | notas anexadas aos cards pela rotina (fora do robô) | — | skills da rotina |
| Google (planilha, Drive, OCR do Docs, e-mail) | temporário — some com o Apps Script | conta sistema@unitycs.com.br | `servidor/src/google/`, `src/gas/` |

## 7. Pendências conhecidas (20/10/2026)

- Anexos ✏️/💰 (links do formulário) às vezes duplicados na criação do card.
- 27 cards antigos sem o campo Unidade; relatório de exceções mostra "dias em ENTREGUES" limitado a ~7.
- 16 comentários duplicados do dia 20/10 aguardando decisão de apagar.
- 5 desarquivamentos antigos feitos por outros usuários (IWQ5486, ARW5715 ×2, BAI6816, JZD9144) — não mexidos.
- Ideias guardadas para a tela própria: ícone na tela inicial do celular, lista de cards como tela inicial, barra de botões embaixo, avisos no celular; carrossel de fotos no topo; escolha do que aparece no card (Completo/Compacto/Só placa) salva por usuário.

## 8. Como manter esta entrega

Toda mudança de regra: atualizar `ESPECIFICACAO-SISTEMA.md` (a seção da regra) **e** este arquivo (§4 se for regra que
engana, §5 se mexer em dado, §7 pendências) no mesmo commit, e uma linha em `SESSOES.md`. O desenvolvedor acompanha
pelo histórico do Git (`git log -- docs/`).
