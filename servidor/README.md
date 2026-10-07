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
`TRELLO_TOKEN`, `TRELLO_SEGREDO`, `URL_PUBLICA`); `TRELLO_QUADRO` e `MODO` são variáveis do repositório no GitHub.

## Modo

- `OBSERVAR` (padrão): só grava no banco, nunca escreve no Trello. É o modo das fases 1–4.
- `ATIVO`: aplica as regras (fase 5).

## Banco

Migrações em `migrations/NNN_nome.sql`, aplicadas na subida do servidor (ou `npm run migrar`).
Nunca editar uma migração já aplicada: criar a próxima.

## Publicação

`.github/workflows/servidor.yml`: testa a cada push em `servidor/`; publica no Cloud Run
(região São Paulo) quando as variáveis `GCP_PROJETO`, `GCP_WIF_PROVIDER` e `GCP_SA_EMAIL` existem no repositório.
