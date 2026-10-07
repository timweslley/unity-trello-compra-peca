#!/usr/bin/env bash
# Prepara o Google Cloud para o servidor "Compra de Peça" (fase 0).
# Rodar UMA vez no Cloud Shell (console.cloud.google.com > ícone de terminal no canto superior direito),
# logado como weslley.santos@unitycs.com.br:
#   curl -sL https://raw.githubusercontent.com/timweslley/unity-trello-compra-peca/main/servidor/infra/preparar-gcp.sh | bash
# Pode rodar de novo sem problema: cada passo confere se já foi feito.
#
# O que cria (nada é cobrado fora do crédito de avaliação; o uso previsto cabe na cota gratuita):
#   projeto unity-compra-peca · APIs do Cloud Run, Artifact Registry, Secret Manager e IAM
#   repositório de imagens "servidor" (São Paulo) · conta "compra-peca-run" (com a qual o servidor roda)
#   conta "publicador" (usada só pelo GitHub Actions, sem chave/senha: Workload Identity Federation)
#   segredos DATABASE_URL, TRELLO_KEY, TRELLO_TOKEN, TRELLO_SEGREDO com o valor "PREENCHER"
set -uo pipefail

PROJETO="${PROJETO:-unity-compra-peca}"
REGIAO="southamerica-east1"
REPO_GITHUB="timweslley/unity-trello-compra-peca"
PUB="publicador"
RUN="compra-peca-run"

falhou() { echo; echo "!! PAROU no passo: $1"; echo "!! Copie as linhas acima (a partir do '==') e mande para o Claude."; exit 1; }

echo "== 1/8 Projeto"
if ! gcloud projects describe "$PROJETO" >/dev/null 2>&1; then
  ORG=$(gcloud organizations list --format='value(ID)' 2>/dev/null | head -1)
  ARG_ORG=""; [ -n "$ORG" ] && ARG_ORG="--organization=$ORG"
  if ! gcloud projects create "$PROJETO" --name="Compra de Peca" $ARG_ORG; then
    # o ID é global no Google: se outro cliente já usa, tenta com o sufixo da empresa
    PROJETO="${PROJETO}-unitycs"
    gcloud projects describe "$PROJETO" >/dev/null 2>&1 || gcloud projects create "$PROJETO" --name="Compra de Peca" $ARG_ORG || falhou "criar projeto"
  fi
fi
gcloud config set project "$PROJETO" >/dev/null 2>&1
NUM=$(gcloud projects describe "$PROJETO" --format='value(projectNumber)') || falhou "ler número do projeto"
echo "   $PROJETO ($NUM)"

echo "== 2/8 Faturamento (crédito da avaliação gratuita)"
CONTA=$(gcloud billing accounts list --filter='open=true' --format='value(ACCOUNT_ID)' | head -1)
[ -z "$CONTA" ] && falhou "nenhuma conta de faturamento aberta — termine a ativação da avaliação gratuita"
gcloud billing projects link "$PROJETO" --billing-account="$CONTA" >/dev/null || falhou "vincular faturamento"
echo "   conta $CONTA"

echo "== 3/8 APIs (1–2 min)"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com >/dev/null || falhou "ativar APIs"
echo "   ok"

echo "== 4/8 Repositório de imagens (São Paulo)"
gcloud artifacts repositories describe servidor --location="$REGIAO" >/dev/null 2>&1 || \
  gcloud artifacts repositories create servidor --location="$REGIAO" --repository-format=docker \
    --description="Imagens do servidor Compra de Peça" >/dev/null || falhou "criar repositório de imagens"
# guarda só as 10 imagens mais recentes (o resto apagaria o espaço gratuito de 0,5 GB)
cat > /tmp/limpeza.json <<'EOF'
[{"name":"manter-10","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":10}},
 {"name":"apagar-resto","action":{"type":"Delete"},"condition":{"tagState":"any"}}]
EOF
gcloud artifacts repositories set-cleanup-policies servidor --location="$REGIAO" --policy=/tmp/limpeza.json --no-dry-run >/dev/null 2>&1 || true
echo "   ok"

echo "== 5/8 Contas de serviço"
SA_PUB="$PUB@$PROJETO.iam.gserviceaccount.com"
SA_RUN="$RUN@$PROJETO.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA_PUB" >/dev/null 2>&1 || gcloud iam service-accounts create "$PUB" --display-name="Publicador (GitHub Actions)" >/dev/null || falhou "criar conta publicador"
gcloud iam service-accounts describe "$SA_RUN" >/dev/null 2>&1 || gcloud iam service-accounts create "$RUN" --display-name="Servidor Compra de Peça (Cloud Run)" >/dev/null || falhou "criar conta do servidor"
sleep 5   # a conta recém-criada demora alguns segundos para valer nas permissões
for PAPEL in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$SA_PUB" --role="$PAPEL" --condition=None >/dev/null || falhou "permissão $PAPEL"
done
# o publicador pode colocar o servidor para rodar com a conta compra-peca-run (e só com ela)
gcloud iam service-accounts add-iam-policy-binding "$SA_RUN" --member="serviceAccount:$SA_PUB" --role="roles/iam.serviceAccountUser" >/dev/null || falhou "publicador usar a conta do servidor"
echo "   ok"

echo "== 6/8 Acesso do GitHub sem senha (Workload Identity Federation)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions" >/dev/null || falhou "criar pool"
gcloud iam workload-identity-pools providers describe github --location=global --workload-identity-pool=github >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc github --location=global --workload-identity-pool=github \
    --display-name="GitHub" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO_GITHUB'" >/dev/null || falhou "criar provedor GitHub"
gcloud iam service-accounts add-iam-policy-binding "$SA_PUB" --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO_GITHUB" >/dev/null \
  || falhou "liberar o repositório $REPO_GITHUB (se o erro falar em 'constraints/iam.allowedPolicyMemberDomains', é a trava de domínio da organização)"
echo "   ok (só o repositório $REPO_GITHUB pode publicar)"

echo "== 7/8 Segredos (o servidor só lê; os valores reais você cadastra no console)"
for S in DATABASE_URL TRELLO_KEY TRELLO_TOKEN TRELLO_SEGREDO; do
  gcloud secrets describe "$S" >/dev/null 2>&1 || printf 'PREENCHER' | gcloud secrets create "$S" --data-file=- --replication-policy=automatic >/dev/null || falhou "criar segredo $S"
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:$SA_RUN" --role="roles/secretmanager.secretAccessor" >/dev/null || falhou "servidor ler $S"
done
echo "   ok"

echo "== 8/8 PRONTO. Mande estas 2 linhas para o Claude:"
echo
echo "GCP_PROJETO=$PROJETO"
echo "GCP_NUMERO=$NUM"
echo
echo "Endereço que o servidor vai ter: https://compra-peca-$NUM.$REGIAO.run.app"
