# Servidor próprio — Compra de Peça

Substitui o Apps Script (robô + backend do formulário). Plano em `../docs/PROJETO-SERVIDOR.md`;
regras em `../docs/ESPECIFICACAO-SISTEMA.md`.

## Rodar em desenvolvimento

```
cd servidor
cp .env.exemplo .env      # preencha DATABASE_URL (Neon/Supabase) e as chaves do Trello
npm install
npm run dev               # http://localhost:8080/saude
npm test
```

Sem `DATABASE_URL` o servidor sobe só com `/saude` (útil para conferir a publicação).

## Rotas (fase 0)

| Rota | O que faz |
|---|---|
| `GET /saude` | versão, modo (OBSERVAR/ATIVO), quadro, estado do banco, chamadas ao Trello |
| `HEAD /trello/webhook` | resposta 200 que o Trello exige ao registrar o webhook |
| `POST /trello/webhook` | recebe cada ação do quadro, confere a assinatura (`TRELLO_SEGREDO`) e grava em `trello_acao` |

Ao subir com `URL_PUBLICA`, chaves do Trello e banco, o servidor **cria o webhook do quadro sozinho** se ainda não existir.

## Variáveis

Ver `.env.exemplo`. No Cloud Run, as sensíveis vêm do Secret Manager (`DATABASE_URL`, `TRELLO_KEY`,
`TRELLO_TOKEN`, `TRELLO_SEGREDO`); `URL_PUBLICA` (endereço fixo do Cloud Run), `TRELLO_QUADRO` e `MODO` vêm do bloco `env` do workflow.

## Modo

- `OBSERVAR` (padrão): só grava no banco, nunca escreve no Trello. É o modo das fases 1–4.
- `ATIVO`: aplica as regras (fase 5).

## Banco

Migrações em `migrations/NNN_nome.sql`, aplicadas na subida do servidor (ou `npm run migrar`).
Nunca editar uma migração já aplicada: criar a próxima.

## Publicação

`.github/workflows/servidor.yml`: testa a cada push em `servidor/`; quando `GCP_NUMERO` (bloco `env` do
workflow) está preenchido, monta a imagem no GitHub, envia ao Artifact Registry (São Paulo) e publica no
Cloud Run com a conta `compra-peca-run`, conferindo o `/saude` no fim. O acesso do GitHub ao Google é sem
senha (Workload Identity Federation). O Google Cloud é preparado uma vez por `infra/preparar-gcp.sh` (Cloud Shell).

O serviço fica público com `--no-invoker-iam-check` (o Trello precisa chamar o webhook); a organização
unitycs.com.br bloqueia o jeito antigo (`allUsers`). A proteção do webhook é a assinatura do Trello
(`TRELLO_SEGREDO`), e a API do formulário (fase 3) terá login Google.

Os segredos nascem com o valor `PREENCHER`, tratado como vazio: o servidor sobe só com `/saude`, que lista em
`falta` o que ainda precisa ser cadastrado no Secret Manager. Banco inacessível ou migração com erro não derrubam
o servidor — aparecem em `banco`/`migracao` no `/saude`.

## Segurança do quadro principal

Enquanto `TRELLO_QUADRO=ZX4gRmnX` (TESTE) e `MODO=OBSERVAR`, o servidor **não lê nem escreve no quadro principal**
(`oH4TbTqb`) e não escreve em nenhum quadro. O token do servidor é diferente do token do robô (Apps Script), então
as chamadas do servidor não consomem o limite de chamadas do robô que atende o principal.
