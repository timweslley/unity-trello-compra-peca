# Módulo Cilia — API oficial, uma rodada por dia

**Dono:** sessão "rotina Unity" (11/10/2026). Não mexe em `servidor/` nem nas tabelas da outra sessão.

## O que faz
Todo dia às 00:15 (Brasília), o Cloud Run Job `cilia-sync` (projeto `unity-compra-peca`):
1. lista, por casa (Toledo, Cascavel, Rondon, Campo Mourão), os orçamentos de seguradora criados nos últimos 120 dias
   (`GET /external/budgets/external-partners/budgets`, header `auth_token`);
2. grava/atualiza no Postgres, schema **`cilia`** (`orcamento`, `versao`, `execucao`);
3. só para orçamento **novo ou que mudou** (versão, status ou conclusão) baixa o detalhe
   (`GET /external/budgets/external-partners/insurer-budgets`) — peças, totais, conclusão e o **PDF oficial**;
4. salva o PDF no Drive compartilhado `PDF/<casa>/<PLACA> - <SEGURADORA> - Cilia <nº.versão>.pdf` (uma vez por versão)
   e grava `CILIA-HOJE.json` (retrato completo para a rotina) + `Diario/CILIA-AAAA-MM-DD.json` (o que mudou).

Volume baixo, como a Cilia pediu (e-mail de 24–25/09/2026 e parecer "abuso de API"): 1 listagem por casa + no máximo
60 detalhes por dia, 1,2 s entre chamadas, nenhuma repetição. Sem login de usuário, sem navegador.

## Quem lê
- **Rotina da madrugada** (tarefa "Rotina Unity – Portais e Trello"): lê `CILIA-HOJE.json` em vez de logar no Cilia.
- **Sistema interno** (futuro): lê direto do schema `cilia`.
- O "Status do Pedido" (fornecedor/previsão da peça FO) **não** vem pela API — segue por HDI/SOMA/portal.

## Configuração (uma vez)
1. Cloud Shell do projeto: `bash cilia/preparar-gcp.sh` (cria `CILIA_TOKEN_*` com "PREENCHER", libera a conta
   `compra-peca-run@…` e ativa a API do Drive).
2. Weslley cola os tokens no Secret Manager (nova versão de cada `CILIA_TOKEN_*`). Ninguém mais vê os tokens.
3. Drive compartilhado com `compra-peca-run@unity-compra-peca.iam.gserviceaccount.com` como **Gerente de conteúdo**;
   o id da pasta vai em `DRIVE_PASTA_ID` no `.github/workflows/cilia.yml`.
4. Push em `cilia/**` publica o job; Actions → **Cilia** → Run workflow com `casas = TOLEDO` faz o 1º teste.

## Testes
`cd cilia && npm ci && npm test` (sem rede: cliente, banco e Drive falsos).
