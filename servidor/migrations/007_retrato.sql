-- Versão 2.0, passo 1 (08/10/2026): o banco passa a guardar cada pedido do TESTE de forma organizada, em paralelo ao
-- Trello (que continua mandando). O retrato é o mesmo que o formulário vê ao abrir o card (vdf_carregarCard).
-- Depois de uma semana comparando, o formulário passa a ler daqui e, etapa por etapa, a gravar aqui.
CREATE TABLE IF NOT EXISTS pedido_retrato (
  card_id       text PRIMARY KEY,
  short_link    text NOT NULL,
  quadro        text NOT NULL,
  nome          text,
  lista         text,
  tipo          text,                 -- SEGURADORA | PARTICULAR
  dados         jsonb,                -- carro: placa, modelo, ano, chassi, cor, seguradora, sinistro
  pecas         jsonb,                -- peças da oficina (e "não comprar"), com chave, tipos, travada…
  cotacoes      jsonb,
  autorizadas   jsonb,
  pagas         jsonb,
  recebiveis    jsonb,
  totais        jsonb,
  extra         jsonb,                -- o resto do retrato (ordem, unidade, solicitante, devolução…)
  hash          text,                 -- para saber se mudou
  retratado_em  timestamptz NOT NULL DEFAULT now(),
  ms            integer,
  erro          text
);
CREATE INDEX IF NOT EXISTS pedido_retrato_lista ON pedido_retrato (lista);

-- Histórico: uma linha a cada mudança do retrato (para medir tempo em cada etapa e o que mudou)
CREATE TABLE IF NOT EXISTS pedido_historico (
  id         bigserial PRIMARY KEY,
  card_id    text NOT NULL,
  quando     timestamptz NOT NULL DEFAULT now(),
  lista      text,
  hash       text,
  mudou      text[]                   -- partes do retrato que mudaram (lista, pecas, cotacoes, pagas…)
);
CREATE INDEX IF NOT EXISTS pedido_historico_card ON pedido_historico (card_id, quando);

-- Peças em linhas (consulta e relatório)
CREATE OR REPLACE VIEW v_peca AS
SELECT r.card_id, r.short_link, r.nome AS card, r.lista, (p.ord)::int AS n,
       p.e->>'chave' AS chave, p.e->>'codigo' AS codigo, p.e->>'descricao' AS descricao,
       p.e->'tipos' AS tipos, p.e->>'qtd' AS qtd, (p.e->>'particular')::boolean AS particular,
       COALESCE((p.e->>'naoComprar')::boolean, false) AS nao_comprar, p.e->>'travada' AS situacao, p.e->>'valorOrc' AS valor_orcamento
FROM pedido_retrato r, jsonb_array_elements(COALESCE(r.pecas, '[]'::jsonb)) WITH ORDINALITY AS p(e, ord);
