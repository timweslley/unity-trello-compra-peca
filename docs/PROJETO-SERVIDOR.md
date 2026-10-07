# Projeto: levar o sistema "Compra de Peça" para servidor próprio

**Início: 07/10/2026 · dono: Weslley · construção: Claude (sessões de trabalho) · base: `docs/ESPECIFICACAO-SISTEMA.md`**

## Decisões tomadas (07/10/2026)

| Tema | Decisão | Por quê |
|---|---|---|
| Hospedagem | **Google Cloud Run** no projeto `unity-compra-peca` (organização unitycs.com.br), usando o crédito de avaliação (US$ 300 / 90 dias, ativado em 07/10/2026 na conta weslley.santos@) | fica na conta Google que ele já administra; sem máquina para cuidar; cota gratuita permanente cobre nosso volume |
| Banco | **PostgreSQL gratuito** (Neon ou Supabase, 0,5 GB) — não usar Cloud SQL | custo ~zero depois do crédito; nosso volume é pequeno |
| Linguagem | **TypeScript / Node.js** (Fastify) | mesmo idioma do formulário e das regras já escritas em JS; fácil de portar os leitores |
| Login | **Login Google (unitycs.com.br)**; papéis por e-mail/grupo do Workspace. Durante a convivência com o Trello, os comentários saem pela conta do robô com o nome da pessoa no texto | ele controla acesso no Admin; prepara a tela própria |
| Trello | **Continua como tela da equipe na primeira entrega**; o servidor substitui o robô e o backend do formulário. **Tela própria vem depois** (fase 6), por isso o banco é a fonte de verdade desde o início | migração sem reensinar ninguém |
| Código | Pasta `servidor/` **neste repositório** (monorepo) | especificação, formulário e servidor evoluem juntos, um commit só |
| Integração com o Trello | **Webhooks** (tempo real) + varredura de segurança a cada 30 min | fim do ciclo de 1 min e da espera do Google |
| OCR | `pdftotext` (PDF com texto) + Tesseract (imagem/escaneado) no próprio servidor, fila com cache por hash | mesmo resultado, sem Drive/Docs |
| E-mail | SMTP do Workspace (conta sistema@) | já existe |

**Lembrete:** o crédito do Google acaba por volta de **05/01/2027**. Antes disso, avaliar o uso real (meta: ficar dentro da cota gratuita) e decidir se ativa a conta completa.

## Fases

| Fase | Entrega | Pronto quando | Status |
|---|---|---|---|
| **0 · Base** | `servidor/` com API, banco com migrações, webhook do Trello, Dockerfile, CI de publicação; projeto no Google Cloud ligado ao faturamento; primeiro deploy | `GET /saude` responde no Cloud Run | ✅ concluída 07/10 |
| **1 · Ouvir o Trello** | webhooks do quadro de TESTE gravando tudo no banco (cards, descrição completa, checklists, anexos, comentários, ações); importação dos cards existentes (aba TRAVA + EVENTOS) | banco espelha o quadro em tempo real sem mexer em nada | ✅ concluída 07/10 |
| **2 · Leitura de documentos** | leitores HDI / Soma / Cilia / Status do Pedido / NF portados, testados contra os PDFs reais já conhecidos | mesmos resultados do robô atual nos casos de referência | ✅ concluída 07/10 |
| **3 · Formulário** | formulário atual apontando para o servidor novo (mesmas funções `vdf_*` e respostas) + login Google; no quadro de TESTE | setor de compras testa em paralelo | — |
| **4 · Robô** | validação, movimentos, travas, SLA, relatório diário, exclusão — por webhook; uma semana em modo "só observar" comparando com o Apps Script | zero divergência na semana | — |
| **5 · Virada** | quadro principal; Apps Script em `VD_LIGADO=NAO` (reserva 30 dias); monitoramento e alertas | equipe trabalhando normal | — |
| **6 · Tela própria** | painel/quadro próprio substituindo o Trello (desenho já começado no artefato de design) | decisão depois da fase 5 | — |

## Responsabilidades

- **Weslley:** conta e faturamento do Google Cloud (feito), conta do banco gratuito, aprovar passos no console pelo Chrome, testar com a equipe nas fases 3–4, decidir a virada.
- **Claude:** todo o código, migrações, CI, testes, documentação; atualizar este arquivo, a especificação e o estado no Drive a cada sessão.

## Diário

- 07/10/2026 — decisões acima; conta Google Cloud criada com crédito; início da fase 0 (pasta `servidor/`).
- 07/10/2026 (tarde) — publicação revisada antes do primeiro uso: imagem montada no GitHub e enviada ao Artifact Registry (sem Cloud Build), servidor roda com conta própria `compra-peca-run`, acesso público por `--no-invoker-iam-check` (a organização bloqueia `allUsers`), endereço fixo `https://compra-peca-<número>.southamerica-east1.run.app`, segredos em `PREENCHER` não derrubam o servidor e aparecem em `falta` no `/saude`. Testado localmente com Postgres 16 (migração, nova subida, webhook sem duplicar). Falta: rodar `preparar-gcp.sh` no Cloud Shell, banco Neon, cadastrar os segredos.
- 07/10/2026 11:25 — **Google Cloud preparado e primeiro deploy no ar.** `preparar-gcp.sh` rodado no Cloud Shell (projeto `unity-compra-peca`, nº 858550421734, crédito vinculado; 1ª execução parou no repositório de imagens por propagação da API, 2ª passou inteira). CI publicou a versão `6a09447`: `https://compra-peca-858550421734.southamerica-east1.run.app/saude` responde (OBSERVAR, quadro TESTE). Pendente da fase 0: Weslley cadastrar os 4 segredos (DATABASE_URL do Neon, TRELLO_KEY, TRELLO_TOKEN, TRELLO_SEGREDO) e nova publicação para o servidor ler os valores, migrar o banco e criar o webhook.
- 07/10/2026 11:50 — os 4 segredos cadastrados no Secret Manager (versão 2 de cada; TRELLO_TOKEN gerado pela conta Trello do Weslley no app "Log de Descricao Unity" — trocar pela conta do robô antes de o servidor escrever no Trello). Nova publicação para ler os segredos, migrar o banco e criar o webhook do quadro TESTE.
- 07/10/2026 11:58 — **fase 0 concluída.** `/saude` (versão `43bed20`): banco Neon ok, migração em dia, webhook do quadro TESTE ativo (`6ac65d6fa935f74eb9dcf496`), nada faltando; `acoes` mostra o que o Trello enviou. Correções do dia: webhook exige o id longo do quadro; trava no código — o quadro principal `oH4TbTqb` só com `PERMITIR_PRINCIPAL=SIM` (fase 5). Próximo: fase 1 (espelho do quadro TESTE no banco + importação dos cards existentes).
- 07/10/2026 12:10 — Weslley liberou o TESTE em modo ATIVO (principal segue bloqueado no código). Fase 1, parte 1: espelho do Trello (migração 002, `trello/espelho.ts`, `/tarefas/sincronizar`, card relido a cada ação, retrato completo a cada 30 min, histórico de ações, view `comentario`); 15 testes, os de banco rodando também no GitHub com Postgres próprio. Parte 2: importar abas TRAVA (descrição completa) e EVENTOS da planilha do robô.
- 07/10/2026 12:21 — fase 1, parte 1 publicada (`82f43a2`; o envio ao GitHub ficou recusado ~15 min com erro interno do GitHub e voltou sozinho). Primeira cópia do quadro TESTE: 217 cards (150 abertos), 9 colunas, 2.338 ações de histórico importadas (3 páginas, completo).
- 07/10/2026 15:05 — **fase 1 concluída.** Planilha do robô compartilhada como Leitor com `compra-peca-run` (sem notificação) e API do Sheets ativada no projeto (Cloud Shell). Primeira leitura: TRAVA 252 linhas → descrição completa em todos os 217 cards do TESTE (as outras 35 são de cards do principal, guardadas só como leitura); EVENTOS 1.074 linhas → 1.073 eventos (1 linha idêntica a outra, mesmo segundo, contou uma vez). Tudo se atualiza junto com o retrato do quadro (a cada 30 min, puxado pela chegada de ações). Próximo: fase 2 — leitores de documentos (HDI, Soma, Cilia, Status do Pedido, NF).
- 07/10/2026 16:25 — **fase 2 concluída.** Leitores = cópia fiel do Apps Script gerada por `servidor/scripts/extrair-leitores.mjs` (50 funções; adaptadores só para `Utilities.formatDate` e a lista de fornecedores) → `src/leitores/robo.js`; texto por `pdftotext` (versões layout e simples, fica a que rende mais) e Tesseract português para escaneado/foto; leitura guardada por anexo em `anexo_leitura` (`VERSAO_LEITOR`). Conferência com os 149 cards abertos do TESTE: 487 anexos, 0 erros, 111 orçamentos, 9 documentos de fornecimento; gabarito do robô (códigos que ele importou do orçamento) 13/13; FO lidas × checklist 406/465 — as diferenças vistas são do card (código trocado depois pelo Status do Pedido, card antigo sem checklist, orçamento original + complemento), não do leitor. PDFs não reconhecidos: 59 notas fiscais, 4 orçamentos que o robô também não lê (particular sem seguradora, card em espera), 2 outros. Desempenho: Cloud Run passou a 2 vCPU / 2 GiB e lê 3 anexos por vez (fotos com OCR levam ~6 s). Próximo: fase 3 — formulário apontando para o servidor + login Google.
- 07/10/2026 17:50 — **fase 3a no ar (formulário do TESTE no servidor).** Mesmo caminho da fase 2: o código do robô usado pelo formulário (`doPost` + 28 `vdf_*` → 330 funções) é copiado sem alteração para `servidor/recursos/formulario.gs.js` (`npm run extrair-formulario`) e roda num trabalhador (`src/gas/trabalhador.ts`) com os serviços do Google imitados: UrlFetchApp, PropertiesService (tabela `gas_propriedade`), CacheService (memória), SpreadsheetApp (abas em `gas_aba`/`gas_linha`; TRAVA, EVENTOS, FORNECEDORES e CHECKLISTS copiadas da planilha real no 1º uso), DriveApp/Drive/DocumentApp (arquivos em `gas_arquivo`, OCR pelo servidor), Utilities, LockService, MailApp (por ora só registra), ScriptApp (gatilhos "depois de N s"), ContentService. O código continua síncrono: o trabalhador espera cada pedido de rede/banco (Atomics.wait + receiveMessageOnPort). Rota `POST /api` = mesmo protocolo do Apps Script. Proteção no servidor: toda gravação no Trello só passa se o alvo é do quadro TESTE no espelho. Power-Up: `config.js` com `URL_SERVIDOR` e `QUADROS_SERVIDOR: ['ZX4gRmnX']`; `form.html` manda `srv=1` só no TESTE; o formulário estático usa o servidor só com `srv=1` (principal e links antigos continuam no Apps Script). Login ainda pelo token do Trello (fase 3b: login Google).
