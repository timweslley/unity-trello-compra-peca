-- Fase 1, parte 2 (07/10/2026): leitura da planilha do robô (Apps Script) — "Validação Trello — backup de descrições".
-- Só leitura: o servidor nunca escreve na planilha. Enquanto o robô atende o quadro principal, ela segue sendo dele.

-- aba TRAVA: a descrição oficial (completa) de cada card, de todos os quadros que o robô já atendeu
CREATE TABLE IF NOT EXISTS planilha_trava (
  card_id     text PRIMARY KEY,
  assinatura  text,
  quando      timestamptz,
  vitrine     text,                 -- coluna D: o que o robô põe na descrição do Trello
  completa    text,                 -- coluna E: a descrição oficial completa (fonte de verdade das peças)
  lida_em     timestamptz NOT NULL DEFAULT now()
);

-- aba EVENTOS → tabela evento (já existe): cada linha da planilha entra uma vez só
ALTER TABLE evento ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'servidor';   -- servidor | planilha
ALTER TABLE evento ADD COLUMN IF NOT EXISTS chave text;                                -- hash da linha da planilha
CREATE UNIQUE INDEX IF NOT EXISTS evento_chave ON evento (chave) WHERE chave IS NOT NULL;
ALTER TABLE evento ADD COLUMN IF NOT EXISTS card_link text;
ALTER TABLE evento ADD COLUMN IF NOT EXISTS card_nome text;

-- o card do espelho ganha a descrição oficial vinda da TRAVA
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS desc_assinatura text;
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS desc_trava_em timestamptz;
