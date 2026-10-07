#!/usr/bin/env bash
# Prepara o projeto no Google Cloud para o servidor "Compra de Peça" (fase 0).
# Rodar UMA vez, no Cloud Shell (console.cloud.google.com > ícone do terminal, canto superior direito),
# logado como weslley.santos@unitycs.com.br:
#   curl -sL https://raw.githubusercontent.com/timweslley/unity-trello-compra-peca/main/servidor/infra/preparar-gcp.sh | bash
# Pode rodar de novo sem problema: cada passo confere se já foi feito.
set -euo pipefail

PROJETO="${PROJETO:-unity-compra-peca}"
REGIAO="southamerica-east1"
REPO_GITHUB="timweslley/unity-trello-compra-peca"
SA="publicador"

echo "== 1/7 Projeto $PROJETO"
if ! gcloud projects describe "$PROJETO" >/dev/null 2>&1; then
  ORG=$(gcloud organizations list --format='value(ID)' | head -1 || true)
  if [ -n "${ORG:-}" ]; then gcloud projects create "$PROJETO" --name="Compra de Peça" --organization="$ORG"
  else gcloud projects create "$PROJETO" --name="Compra de Peça"; fi
fi
gcloud config set project "$PROJETO" >/dev/null
NUM=$(gcloud projects describe "$PROJETO" --format='value(projectNumber)')

echo "== 2/7 Faturamento (crédito da avaliação)"
CONTA=$(gcloud billing accounts list --filter='open=true' --format='value(ACCOUNT_ID)' | head -1)
if [ -z "$CONTA" ]; then echo "!! Nenhuma conta de faturamento aberta. Termine a etapa 2 da avaliação gratuita e rode de novo."; exit 1; fi
gcloud billing projects link "$PROJETO" --billing-account="$CONTA" >/dev/null
echo "   conta $CONTA vinculada"

echo "== 3/7 APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com secretmanager.googleapis.com sts.googleapis.com >/dev/null
echo "   ok"

echo "== 4/7 Conta de serviço que publica ($SA)"
SA_EMAIL="$SA@$PROJETO.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1 || gcloud iam service-accounts create "$SA" --display-name="Publicador (GitHub Actions)"
for PAPEL in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.admin roles/iam.serviceAccountUser roles/storage.admin roles/secretmanager.secretAccessor roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$SA_EMAIL" --role="$PAPEL" --condition=None >/dev/null
done
# o Cloud Run roda com a conta padrão de computação: ela precisa ler os segredos
COMPUTE="$NUM-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$COMPUTE" --role="roles/secretmanager.secretAccessor" --condition=None >/dev/null
echo "   ok"

echo "== 5/7 Acesso do GitHub sem senha (Workload Identity Federation)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe github --location=global --workload-identity-pool=github >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc github --location=global --workload-identity-pool=github \
    --display-name="GitHub" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO_GITHUB'"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO_GITHUB" >/dev/null
echo "   ok"

echo "== 6/7 Segredos (vazios por enquanto — você preenche no console: Security > Secret Manager)"
for S in DATABASE_URL TRELLO_KEY TRELLO_TOKEN TRELLO_SEGREDO URL_PUBLICA; do
  gcloud secrets describe "$S" >/dev/null 2>&1 || printf 'PREENCHER' | gcloud secrets create "$S" --data-file=- --replication-policy=automatic >/dev/null
done
echo "   ok"

echo "== 7/7 Pronto. Copie estas 3 linhas e mande para o Claude (vão nas variáveis do GitHub):"
echo
echo "GCP_PROJETO=$PROJETO"
echo "GCP_WIF_PROVIDER=projects/$NUM/locations/global/workloadIdentityPools/github/providers/github"
echo "GCP_SA_EMAIL=$SA_EMAIL"
echo
echo "Depois: preencha os segredos no Secret Manager (DATABASE_URL do Neon/Supabase; TRELLO_KEY/TOKEN/SEGREDO do robô)."
