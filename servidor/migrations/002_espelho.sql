-- Fase 1 (07/10/2026): espelho do quadro no banco.
-- O quadro (listas, etiquetas, definições dos campos personalizados, membros) e o estado de cada sincronização.

CREATE TABLE IF NOT EXISTS trello_quadro (
  id              text PRIMARY KEY,                 -- id longo do Trello
  short_link      text UNIQUE NOT NULL,             -- ZX4gRmnX
  nome            text NOT NULL,
  listas          jsonb NOT NULL DEFAULT '[]',      -- [{id, nome, pos, fechada}]
  etiquetas       jsonb NOT NULL DEFAULT '[]',      -- [{id, nome, cor}]
  campos_def      jsonb NOT NULL DEFAULT '[]',      -- [{id, nome, tipo, opcoes:{id:texto}}]
  membros         jsonb NOT NULL DEFAULT '[]',      -- [{id, username, nome}]
  sincronizado_em timestamptz
);

-- card excluído no Trello (deleteCard): o registro fica, com a data
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS excluido_em timestamptz;
-- campos crus do Trello (para não perder nada que o mapeamento ainda não usa)
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS cru jsonb;
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS criado_em timestamptz;
ALTER TABLE trello_card ADD COLUMN IF NOT EXISTS capa jsonb;

-- execuções das sincronizações completas e do histórico (para o /saude e para não repetir à toa)
CREATE TABLE IF NOT EXISTS sincronizacao (
  id          bigserial PRIMARY KEY,
  tipo        text NOT NULL,                        -- quadro | historico
  quadro      text NOT NULL,
  inicio      timestamptz NOT NULL DEFAULT now(),
  fim         timestamptz,
  ok          boolean,
  resumo      jsonb,
  erro        text
);
CREATE INDEX IF NOT EXISTS sincronizacao_ult ON sincronizacao (tipo, quadro, inicio DESC);

-- comentários = ações commentCard (o texto pode ser editado depois: updateComment / deleteComment)
CREATE OR REPLACE VIEW comentario AS
SELECT a.id, a.card_id, a.membro_id, a.membro_user, a.data,
       COALESCE(ed.texto, a.corpo->'data'->>'text') AS texto,
       ed.data AS editado_em,
       EXISTS (SELECT 1 FROM trello_acao d WHERE d.tipo = 'deleteComment' AND d.corpo->'data'->'action'->>'id' = a.id) AS apagado
FROM trello_acao a
LEFT JOIN LATERAL (
  SELECT u.corpo->'data'->'action'->>'text' AS texto, u.data
  FROM trello_acao u
  WHERE u.tipo = 'updateComment' AND u.corpo->'data'->'action'->>'id' = a.id
  ORDER BY u.data DESC LIMIT 1
) ed ON true
WHERE a.tipo = 'commentCard';
