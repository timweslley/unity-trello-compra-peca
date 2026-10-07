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
| **0 · Base** | `servidor/` com API, banco com migrações, webhook do Trello, Dockerfile, CI de publicação; projeto no Google Cloud ligado ao faturamento; primeiro deploy | `GET /saude` responde no Cloud Run | no ar (falta segredos) |
| **1 · Ouvir o Trello** | webhooks do quadro de TESTE gravando tudo no banco (cards, descrição completa, checklists, anexos, comentários, ações); importação dos cards existentes (aba TRAVA + EVENTOS) | banco espelha o quadro em tempo real sem mexer em nada | — |
| **2 · Leitura de documentos** | leitores HDI / Soma / Cilia / Status do Pedido / NF portados, testados contra os PDFs reais já conhecidos | mesmos resultados do robô atual nos casos de referência | — |
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
