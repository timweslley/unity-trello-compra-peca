#!/usr/bin/env bash
# Preparação ÚNICA do módulo Cilia no Google Cloud — colar no Cloud Shell do projeto unity-compra-peca.
# Cria os 4 cofres dos tokens (vazios, valor "PREENCHER"), libera a conta do servidor para lê-los e ativa a API do Drive.
# Não pede nem mostra nenhum token: os valores reais você cola depois, pelo console do Secret Manager.
set -euo pipefail
PROJETO=unity-compra-peca
RUN="compra-peca-run@${PROJETO}.iam.gserviceaccount.com"
gcloud config set project "$PROJETO" >/dev/null
gcloud services enable drive.googleapis.com >/dev/null
for CASA in TOLEDO CASCAVEL RONDON MOURAO; do
  S="CILIA_TOKEN_${CASA}"
  gcloud secrets describe "$S" >/dev/null 2>&1 || printf 'PREENCHER' | gcloud secrets create "$S" --data-file=- --replication-policy=automatic >/dev/null
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:${RUN}" --role="roles/secretmanager.secretAccessor" >/dev/null
  echo "ok: ${S}"
done
echo "PRONTO. Agora cole os tokens em: https://console.cloud.google.com/security/secret-manager?project=${PROJETO}"
